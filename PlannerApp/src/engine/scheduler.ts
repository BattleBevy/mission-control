import type { SchedulerInput, SchedulerOutput, ScheduledBlock, GapBlock } from '../types'
import { computeFreeIntervals, subtractInterval } from './intervals'
import { sortFlexibleTasks } from './sort'
import { placeTask } from './place'
import { toMinutes, fromMinutes } from './time'

/**
 * Greedy scheduling pass.
 * 1. Pins hard fixed events (immovable).
 * 2. Places tentative events at their preferred time if free, otherwise the next open slot.
 * 3. Places flexible tasks in priority + tightness order in remaining gaps.
 * Completed and skipped tasks are excluded from placement.
 */
export function runScheduler(input: SchedulerInput): SchedulerOutput {
  const { working_hours, fixed_events, flexible_tasks } = input

  // All-day events are label-only — they don't occupy a time slot.
  const timedEvents = fixed_events.filter(e => !e.all_day)
  const hardEvents = timedEvents.filter(e => !e.tentative)
  const tentativeEvents = timedEvents
    .filter(e => e.tentative)
    .sort((a, b) => toMinutes(a.start_datetime) - toMinutes(b.start_datetime))

  // Pin hard fixed events first — these never move.
  const scheduled: ScheduledBlock[] = hardEvents.map(event => ({
    task_id: event.id,
    title: event.title,
    type: 'fixed',
    start: event.start_datetime,
    end: event.end_datetime,
    status: 'scheduled',
  }))

  // Free intervals are computed from hard events only — tentative events compete for gaps.
  let freeIntervals = computeFreeIntervals(hardEvents, working_hours)

  // Place tentative events: preferred slot first, then next available slot forward.
  // Silently omitted if no slot fits (no conflict generated — these are best-effort).
  for (const event of tentativeEvents) {
    const preferredStart = toMinutes(event.start_datetime)
    const preferredEnd = toMinutes(event.end_datetime)
    const duration = preferredEnd - preferredStart

    let placed: Interval | null = null

    for (const interval of freeIntervals) {
      if (interval.start <= preferredStart && interval.end >= preferredEnd) {
        placed = { start: preferredStart, end: preferredEnd }
        break
      }
    }

    if (!placed) {
      for (const interval of freeIntervals) {
        const slotStart = Math.max(interval.start, preferredStart)
        if (interval.end - slotStart >= duration) {
          placed = { start: slotStart, end: slotStart + duration }
          break
        }
      }
    }

    if (placed) {
      scheduled.push({
        task_id: event.id,
        title: event.title,
        type: 'fixed',
        start: fromMinutes(placed.start),
        end: fromMinutes(placed.end),
        status: 'scheduled',
        tentative: true,
      })
      freeIntervals = subtractInterval(freeIntervals, placed)
    }
  }

  const placeable = flexible_tasks.filter(
    t => t.status !== 'completed' && t.status !== 'skipped',
  )
  const sorted = sortFlexibleTasks(placeable)
  const unscheduled = []

  for (const task of sorted) {
    const placed = placeTask(task, freeIntervals)

    if (placed) {
      scheduled.push({
        task_id: task.id,
        title: task.title,
        type: 'flexible',
        start: fromMinutes(placed.start),
        end: fromMinutes(placed.end),
        status: task.status === 'in_progress' ? 'in_progress' : 'scheduled',
      })
      // Consume 5-min buffer after each flexible task so back-to-back scheduling is prevented.
      // Fixed and tentative events are unaffected — they're placed before this loop runs.
      freeIntervals = subtractInterval(freeIntervals, { start: placed.start, end: placed.end + 5 })
    } else {
      unscheduled.push(task)
    }
  }

  scheduled.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))

  const gaps: GapBlock[] = freeIntervals.map(interval => ({
    type: 'gap',
    start: fromMinutes(interval.start),
    end: fromMinutes(interval.end),
    duration_min: interval.end - interval.start,
  }))

  return { scheduled, unscheduled, gaps }
}

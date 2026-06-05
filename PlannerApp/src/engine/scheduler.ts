import type { SchedulerInput, SchedulerOutput, ScheduledBlock, GapBlock } from '../types'
import { computeFreeIntervals, subtractInterval } from './intervals'
import { sortFlexibleTasks } from './sort'
import { placeTask } from './place'
import { toMinutes, fromMinutes } from './time'

/**
 * Greedy scheduling pass.
 * Pins fixed events, then places flexible tasks in priority + tightness order.
 * Completed and skipped tasks are excluded from placement.
 */
export function runScheduler(input: SchedulerInput): SchedulerOutput {
  const { working_hours, fixed_events, flexible_tasks } = input

  // All-day events are label-only — they don't occupy a time slot.
  const timedEvents = fixed_events.filter(e => !e.all_day)

  const scheduled: ScheduledBlock[] = timedEvents.map(event => ({
    task_id: event.id,
    title: event.title,
    type: 'fixed',
    start: event.start_datetime,
    end: event.end_datetime,
    status: 'scheduled',
  }))

  const placeable = flexible_tasks.filter(
    t => t.status !== 'completed' && t.status !== 'skipped',
  )
  const sorted = sortFlexibleTasks(placeable)

  let freeIntervals = computeFreeIntervals(timedEvents, working_hours)
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
      // Fixed events are unaffected — they're pinned before this loop runs.
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

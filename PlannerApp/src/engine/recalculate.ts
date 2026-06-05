import type { DayPlan, TimeString, WorkingHours, SchedulerOutput } from '../types'
import { toMinutes, fromMinutes } from './time'
import { runScheduler } from './scheduler'

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  start: '07:00',
  end: '00:00',
}

/**
 * Re-runs the scheduler from the current moment forward.
 * Freezes anything that's already done or in progress;
 * only re-places tasks that haven't started yet.
 */
export function recalculate(
  plan: DayPlan,
  now: TimeString,
  workingHours: WorkingHours = DEFAULT_WORKING_HOURS,
): SchedulerOutput {
  const nowMin = toMinutes(now)
  const dayStartMin = toMinutes(workingHours.start)
  const effectiveStartMin = Math.max(nowMin, dayStartMin)

  const liveTasks = plan.flexible_tasks.filter(task => {
    if (
      task.status === 'completed' ||
      task.status === 'skipped' ||
      task.status === 'in_progress'
    ) return false

    // Already started — freeze it even if still marked "scheduled"
    if (task.scheduled_start && toMinutes(task.scheduled_start) <= nowMin) return false

    return true
  })

  // All-day events are label-only — exclude from time-blocking entirely.
  // Drop timed events that have fully ended; keep ongoing ones so their time stays blocked.
  const relevantEvents = plan.fixed_events.filter(
    event => !event.all_day && toMinutes(event.end_datetime) > nowMin,
  )

  return runScheduler({
    working_hours: { start: fromMinutes(effectiveStartMin), end: workingHours.end },
    fixed_events: relevantEvents,
    flexible_tasks: liveTasks,
    current_time: now,
    day: plan.day,
  })
}

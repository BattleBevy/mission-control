import type { DayPlan, TimeString, WorkingHours, SchedulerOutput, ScheduledBlock } from '../types'
import { toMinutes, fromMinutes } from './time'
import { runScheduler } from './scheduler'

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  start: '07:00',
  end: '00:00',
}

/**
 * Re-runs the scheduler from the current moment forward.
 * Freezes tasks that are completed, in_progress, or whose scheduled_start has
 * already passed — re-places only tasks that haven't started yet.
 * Frozen tasks are re-injected into the output at their stored positions so
 * they remain visible on the timeline without being moved.
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
    if (task.scheduled_start && toMinutes(task.scheduled_start) <= nowMin) return false
    return true
  })

  // Tasks that have started but aren't completed/skipped — keep them pinned.
  const frozenTasks = plan.flexible_tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'skipped') return false
    if (task.status === 'in_progress') return true
    return !!(task.scheduled_start && toMinutes(task.scheduled_start) <= nowMin)
  })

  const relevantEvents = plan.fixed_events.filter(event => !event.all_day)

  const liveResult = runScheduler({
    working_hours: { start: fromMinutes(effectiveStartMin), end: workingHours.end },
    fixed_events: relevantEvents,
    flexible_tasks: liveTasks,
    current_time: now,
    day: plan.day,
  })

  // Re-inject frozen tasks at their stored positions so they stay on the timeline.
  const frozenBlocks: ScheduledBlock[] = frozenTasks
    .filter(t => t.scheduled_start && t.scheduled_end)
    .map(t => ({
      task_id: t.id,
      title: t.title,
      type: 'flexible',
      start: t.scheduled_start!,
      end: t.scheduled_end!,
      status: t.status,
    }))

  return {
    ...liveResult,
    scheduled: [...frozenBlocks, ...liveResult.scheduled].sort(
      (a, b) => toMinutes(a.start) - toMinutes(b.start),
    ),
  }
}

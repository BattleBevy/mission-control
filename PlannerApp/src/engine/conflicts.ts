import type { SchedulerOutput, ConflictSet, ConflictItem, ConflictReason, GapBlock } from '../types'
import { toMinutes } from './time'

/**
 * Classifies each unscheduled task by why it couldn't be placed.
 * Called after runScheduler to populate the conflict dialog.
 */
export function detectConflicts(output: SchedulerOutput, now?: string): ConflictSet {
  const conflicts: ConflictItem[] = output.unscheduled.map(task => ({
    task,
    reason: classifyReason(task, output.gaps, now),
  }))

  return { conflicts }
}

function classifyReason(
  task: { duration_min: number; earliest_start: string; latest_end: string },
  remainingGaps: GapBlock[],
  now?: string,
): ConflictReason {
  // Entire allowed window is already in the past
  if (now && toMinutes(task.latest_end) <= toMinutes(now)) return 'window_passed'

  const windowMin = toMinutes(task.latest_end) - toMinutes(task.earliest_start)

  // Window is structurally too small — no amount of rescheduling fixes this
  if (windowMin < task.duration_min) return 'window_too_tight'

  // Not enough total free time left in the day
  const totalFree = remainingGaps.reduce((sum, g) => sum + g.duration_min, 0)
  if (totalFree < task.duration_min) return 'duration_exceeds_remaining'

  // Free time exists and window is big enough, but the overlap never stretches far enough
  return 'no_fitting_slot'
}

import type { TaskInstance, Priority } from '../types'
import { toMinutes } from './time'

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }

/** Minutes of wiggle room a task has within its allowed window. Less = tighter. */
function windowSlack(task: TaskInstance): number {
  return toMinutes(task.latest_end) - toMinutes(task.earliest_start) - task.duration_min
}

/**
 * Sorts flexible tasks for the greedy placement pass.
 * Primary: priority descending (High first).
 * Tiebreak: window slack ascending (tightest window first — least flexibility to reschedule later).
 */
export function sortFlexibleTasks(tasks: TaskInstance[]): TaskInstance[] {
  return [...tasks].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (byPriority !== 0) return byPriority
    return windowSlack(a) - windowSlack(b)
  })
}

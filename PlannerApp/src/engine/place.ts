import type { TaskInstance } from '../types'
import type { Interval } from './intervals'
import { toMinutes } from './time'

/**
 * Finds the earliest slot for a task within its allowed window.
 * Returns the placed start/end in minutes, or null if no slot fits.
 */
export function placeTask(
  task: TaskInstance,
  freeIntervals: Interval[],
): Interval | null {
  const windowStart = toMinutes(task.earliest_start)
  const windowEnd = toMinutes(task.latest_end)

  for (const interval of freeIntervals) {
    const slotStart = Math.max(interval.start, windowStart)
    const slotEnd = Math.min(interval.end, windowEnd)

    if (slotEnd - slotStart >= task.duration_min) {
      return { start: slotStart, end: slotStart + task.duration_min }
    }
  }

  return null
}

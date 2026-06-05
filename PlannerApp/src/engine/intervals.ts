import type { FixedEvent, WorkingHours } from '../types'
import { toMinutes } from './time'

export interface Interval {
  start: number // minutes since midnight
  end: number
}

/**
 * Returns all free time gaps within working hours after pinning fixed events.
 * Events that overlap are merged so no gap is double-counted.
 */
export function computeFreeIntervals(
  events: FixedEvent[],
  workingHours: WorkingHours,
): Interval[] {
  const dayStart = toMinutes(workingHours.start)
  const dayEnd = toMinutes(workingHours.end)

  const sorted = [...events].sort(
    (a, b) => toMinutes(a.start_datetime) - toMinutes(b.start_datetime),
  )

  const free: Interval[] = []
  let cursor = dayStart

  for (const event of sorted) {
    const eventStart = toMinutes(event.start_datetime)
    const eventEnd = toMinutes(event.end_datetime)

    if (eventStart > cursor) {
      free.push({ start: cursor, end: eventStart })
    }
    cursor = Math.max(cursor, eventEnd)
  }

  if (cursor < dayEnd) {
    free.push({ start: cursor, end: dayEnd })
  }

  return free
}

/**
 * Removes a used slot from a list of free intervals.
 * Called after each task is placed so later tasks can't overlap it.
 */
export function subtractInterval(
  intervals: Interval[],
  used: Interval,
): Interval[] {
  const result: Interval[] = []

  for (const interval of intervals) {
    const noOverlap = used.end <= interval.start || used.start >= interval.end
    if (noOverlap) {
      result.push(interval)
      continue
    }
    if (interval.start < used.start) {
      result.push({ start: interval.start, end: used.start })
    }
    if (used.end < interval.end) {
      result.push({ start: used.end, end: interval.end })
    }
  }

  return result
}

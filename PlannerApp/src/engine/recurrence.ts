import type { TaskTemplate, TaskInstance } from '../types'

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly_date' | 'monthly_weekday'
  days?: number[]    // 0=Sun…6=Sat; used by weekly, biweekly, monthly_weekday
  anchor?: string    // DateString — a known occurrence date used to determine biweekly parity
  date?: number      // day-of-month (1–31) for monthly_date
  nth?: number       // 1=first, 2=second, 3=third, 4=fourth for monthly_weekday
}

export function parseRecurrence(str: string): RecurrenceRule | null {
  try {
    return JSON.parse(str) as RecurrenceRule
  } catch {
    return null
  }
}

export function shouldFireOnDay(rule: RecurrenceRule, day: string): boolean {
  if (rule.type === 'daily') return true

  if (rule.type === 'weekly') {
    const weekday = new Date(day + 'T00:00:00').getDay()
    return (rule.days ?? []).includes(weekday)
  }

  if (rule.type === 'biweekly') {
    const weekday = new Date(day + 'T00:00:00').getDay()
    if (!(rule.days ?? []).includes(weekday)) return false
    if (!rule.anchor) return false
    const anchorMs = new Date(rule.anchor + 'T00:00:00').getTime()
    const dayMs = new Date(day + 'T00:00:00').getTime()
    // Round to nearest whole week; even distance from anchor = on-week
    const weeksDiff = Math.round((dayMs - anchorMs) / (7 * 24 * 60 * 60 * 1000))
    return weeksDiff % 2 === 0
  }

  if (rule.type === 'monthly_date') {
    const d = new Date(day + 'T00:00:00')
    return d.getDate() === (rule.date ?? 1)
  }

  if (rule.type === 'monthly_weekday') {
    const d = new Date(day + 'T00:00:00')
    const weekday = d.getDay()
    if (!(rule.days ?? []).includes(weekday)) return false
    // Which occurrence of this weekday within the month? ceil(dayOfMonth / 7)
    const nth = Math.ceil(d.getDate() / 7)
    return nth === (rule.nth ?? 1)
  }

  return false
}

export function buildRecurrenceString(
  type: 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly_date' | 'monthly_weekday',
  days: number[],
  anchor?: string,
  monthlyDate?: number,
  monthlyNth?: number,
): string | undefined {
  if (type === 'never') return undefined
  if (type === 'daily') return JSON.stringify({ type: 'daily' })
  if (type === 'biweekly') return JSON.stringify({ type: 'biweekly', days, anchor })
  if (type === 'monthly_date') return JSON.stringify({ type: 'monthly_date', date: monthlyDate ?? 1 })
  if (type === 'monthly_weekday') return JSON.stringify({ type: 'monthly_weekday', nth: monthlyNth ?? 1, days })
  return JSON.stringify({ type: 'weekly', days })
}

export function createInstance(template: TaskTemplate, day: string): TaskInstance {
  return {
    id: crypto.randomUUID(),
    template_id: template.id,
    title: template.title,
    duration_min: template.default_duration_min,
    earliest_start: template.default_constraints.earliest_start ?? '07:00',
    latest_end: template.default_constraints.latest_end ?? '00:00',
    priority: template.default_constraints.priority ?? 'Medium',
    tags: [...template.default_tags],
    splittable: false,
    status: 'not_scheduled',
    day,
  }
}

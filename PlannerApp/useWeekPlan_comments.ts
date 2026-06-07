import { useState, useEffect } from 'react'
import { getDocs, query, where, collection } from 'firebase/firestore'
import { db } from '../firebase'
import type { TaskInstance, FixedEvent, EventTemplate, Suppression, ScheduledBlock } from '../types'
import { parseRecurrence, shouldFireOnDay } from '../engine/recurrence'
import { runScheduler } from '../engine/scheduler'
import { DEFAULT_WORKING_HOURS } from '../engine/recalculate'

export interface WeekDayPlan {
  day: string
  scheduled: ScheduledBlock[]
  allDayEvents: FixedEvent[]
}

function weekDaysFrom(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

export function useWeekPlan(
  userId: string,
  weekStart: string,
): { days: WeekDayPlan[]; loading: boolean } {
  const [days, setDays] = useState<WeekDayPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchWeek() {
      try {
        const weekDays = weekDaysFrom(weekStart)

        const [tasksSnap, eventsSnap, templatesSnap, suppressionsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users', userId, 'tasks'), where('day', 'in', weekDays))),
          getDocs(query(collection(db, 'users', userId, 'events'), where('day', 'in', weekDays))),
          getDocs(collection(db, 'users', userId, 'event_templates')),
          getDocs(query(collection(db, 'users', userId, 'event_suppressions'), where('day', 'in', weekDays))),
        ])

        const allTasks = tasksSnap.docs.map(d => d.data() as TaskInstance)
        const rawEvents = eventsSnap.docs.map(d => d.data() as FixedEvent)
        const eventTemplates = templatesSnap.docs.map(d => d.data() as EventTemplate)
        const suppressions = suppressionsSnap.docs.map(d => d.data() as Suppression)

        // template_id → set of suppressed days
        const suppressionMap = new Map<string, Set<string>>()
        for (const s of suppressions) {
          if (!suppressionMap.has(s.template_id)) suppressionMap.set(s.template_id, new Set())
          suppressionMap.get(s.template_id)!.add(s.day)
        }

        const result: WeekDayPlan[] = weekDays.map(day => {
          const dayTasks = allTasks.filter(t => t.day === day)
          const dayEvents = rawEvents.filter((e: FixedEvent) => e.day === day)

          const materialized: FixedEvent[] = eventTemplates.flatMap(t => {
            if (suppressionMap.get(t.id)?.has(day)) return []
            if (t.start_date && day < t.start_date) return []
            if (t.end_date && day > t.end_date) return []
            const rule = parseRecurrence(t.recurrence)
            if (!rule || !shouldFireOnDay(rule, day)) return []
            return [{
              id: `${t.id}-${day}`,
              title: t.title,
              start_datetime: t.start_time,
              end_datetime: t.end_time,
              day,
              template_id: t.id,
              ...(t.notes ? { notes: t.notes } : {}),
              ...(t.all_day ? { all_day: true } : {}),
            }]
          })

          const allEvents = [...dayEvents, ...materialized]
          const allDayEvents = allEvents.filter(e => e.all_day)

          const output = runScheduler({
            working_hours: DEFAULT_WORKING_HOURS,
            fixed_events: allEvents,
            flexible_tasks: dayTasks,
            current_time: DEFAULT_WORKING_HOURS.start,
            day,
          })

          return { day, scheduled: output.scheduled, allDayEvents }
        })

        if (!cancelled) {
          setDays(result)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchWeek()
    return () => { cancelled = true }
  }, [userId, weekStart])

  return { days, loading }
}

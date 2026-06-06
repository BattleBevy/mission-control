import type { TaskInstance, FixedEvent, TaskTemplate, AnytimeTask } from '../types'

export function createDemoSeed(day: string): {
  tasks: TaskInstance[]
  events: FixedEvent[]
  templates: TaskTemplate[]
  anytimeTasks: AnytimeTask[]
} {
  const tasks: TaskInstance[] = [
    // ── Personal tasks before work hours (07:00–10:00) ─────────────────────────
    {
      id: 'demo-t1',
      title: 'Morning run',
      duration_min: 35,
      earliest_start: '07:00',
      latest_end: '10:00',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '07:00',
      scheduled_end: '07:35',
      day,
    },
    {
      id: 'demo-t2',
      title: 'Breakfast & news',
      duration_min: 25,
      earliest_start: '07:00',
      latest_end: '10:00',
      priority: 'Low',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '07:40',
      scheduled_end: '08:05',
      day,
    },
    // ── Work tasks inside work hours band (10:00–18:00) ────────────────────────
    {
      id: 'demo-t3',
      title: 'Review pull requests',
      duration_min: 45,
      earliest_start: '10:00',
      latest_end: '18:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '10:05',
      scheduled_end: '10:50',
      day,
    },
    {
      id: 'demo-t4',
      title: 'Write unit tests — auth service',
      duration_min: 90,
      earliest_start: '10:00',
      latest_end: '18:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '10:55',
      scheduled_end: '12:25',
      day,
    },
    {
      id: 'demo-t5',
      title: 'On-call runbook update',
      duration_min: 60,
      earliest_start: '10:00',
      latest_end: '18:00',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '13:05',
      scheduled_end: '14:05',
      day,
    },
    // ── Personal tasks after work hours (18:00+) — active, scheduler places them
    {
      id: 'demo-t6',
      title: 'Evening walk',
      duration_min: 25,
      earliest_start: '18:00',
      latest_end: '23:55',
      priority: 'Low',
      tags: [],
      splittable: false,
      status: 'not_scheduled',
      day,
    },
    {
      id: 'demo-t7',
      title: 'Call family',
      duration_min: 20,
      earliest_start: '18:00',
      latest_end: '23:55',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'not_scheduled',
      day,
    },
  ]

  const events: FixedEvent[] = [
    {
      id: 'demo-e1',
      title: 'Team Standup',
      start_datetime: '09:00',
      end_datetime: '09:30',
      day,
    },
    {
      id: 'demo-e2',
      title: 'Lunch',
      start_datetime: '12:00',
      end_datetime: '13:00',
      day,
    },
    {
      id: 'demo-e3',
      title: 'Architecture Review',
      start_datetime: '15:00',
      end_datetime: '15:45',
      day,
      tentative: true,
    },
  ]

  // Task Bank templates — mix of personal and work
  const templates: TaskTemplate[] = [
    {
      id: 'demo-tmpl-1',
      title: 'Morning workout',
      default_duration_min: 40,
      default_tags: [],
      default_constraints: { priority: 'Medium', earliest_start: '07:00', latest_end: '10:00' },
    },
    {
      id: 'demo-tmpl-2',
      title: 'Review pull requests',
      default_duration_min: 45,
      default_tags: [],
      default_constraints: { priority: 'High', earliest_start: '10:00', latest_end: '18:00' },
    },
    {
      id: 'demo-tmpl-3',
      title: 'Meal prep',
      default_duration_min: 45,
      default_tags: [],
      default_constraints: { priority: 'Medium', earliest_start: '17:00', latest_end: '20:00' },
    },
    {
      id: 'demo-tmpl-4',
      title: 'Weekly planning',
      default_duration_min: 30,
      default_tags: [],
      default_constraints: { priority: 'Low' },
    },
  ]

  // Anytime tasks — mix of personal and work
  const anytimeTasks: AnytimeTask[] = [
    {
      id: 'demo-any-1',
      title: 'Pick up dry cleaning',
      rough_duration_min: 15,
      tags: [],
      completed: false,
    },
    {
      id: 'demo-any-2',
      title: 'Check Slack DMs',
      rough_duration_min: 10,
      tags: [],
      completed: false,
    },
    {
      id: 'demo-any-3',
      title: 'Read',
      rough_duration_min: 30,
      tags: [],
      completed: false,
    },
  ]

  return { tasks, events, templates, anytimeTasks }
}

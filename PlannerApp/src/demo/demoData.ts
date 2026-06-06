import type { TaskInstance, FixedEvent, TaskTemplate, AnytimeTask } from '../types'

export function createDemoSeed(day: string): {
  tasks: TaskInstance[]
  events: FixedEvent[]
  templates: TaskTemplate[]
  anytimeTasks: AnytimeTask[]
} {
  const tasks: TaskInstance[] = [
    // ── Morning tasks before work hours (07:00–10:00) ──────────────────────────
    {
      id: 'demo-t1',
      title: 'Tend the garden — harvest what\'s ready',
      duration_min: 30,
      earliest_start: '07:00',
      latest_end: '10:00',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '07:00',
      scheduled_end: '07:30',
      day,
    },
    {
      id: 'demo-t2',
      title: 'Feed Gerald & administer his supplements',
      duration_min: 15,
      earliest_start: '07:00',
      latest_end: '10:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '07:35',
      scheduled_end: '07:50',
      day,
    },
    // ── Professional hexing hours (10:00–18:00) ────────────────────────────────
    {
      id: 'demo-t3',
      title: 'Brew commissioned potion batch — Widow Ashgrove\'s order',
      duration_min: 90,
      earliest_start: '10:00',
      latest_end: '18:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '10:05',
      scheduled_end: '11:35',
      day,
    },
    {
      id: 'demo-t4',
      title: 'Draft curse consultation report',
      duration_min: 60,
      earliest_start: '10:00',
      latest_end: '18:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '11:40',
      scheduled_end: '12:40',
      day,
    },
    {
      id: 'demo-t5',
      title: 'Reply to correspondence',
      duration_min: 45,
      earliest_start: '10:00',
      latest_end: '18:00',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '13:25',
      scheduled_end: '14:10',
      day,
    },
    // ── Evening tasks (18:00+) — active, scheduler places them ────────────────
    {
      id: 'demo-t6',
      title: 'Evening ritual',
      duration_min: 20,
      earliest_start: '18:00',
      latest_end: '23:55',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'not_scheduled',
      day,
    },
    {
      id: 'demo-t7',
      title: 'Update the grimoire',
      duration_min: 30,
      earliest_start: '18:00',
      latest_end: '23:55',
      priority: 'Low',
      tags: [],
      splittable: false,
      status: 'not_scheduled',
      day,
    },
  ]

  const events: FixedEvent[] = [
    {
      id: 'demo-e1',
      title: 'Coven Check-in',
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
      title: 'Client Consultation — Mr. Fernwick',
      start_datetime: '15:00',
      end_datetime: '15:45',
      day,
      tentative: true,
    },
  ]

  const templates: TaskTemplate[] = [
    {
      id: 'demo-tmpl-1',
      title: 'Morning herb harvest',
      default_duration_min: 30,
      default_tags: [],
      default_constraints: { priority: 'Medium', earliest_start: '07:00', latest_end: '10:00' },
    },
    {
      id: 'demo-tmpl-2',
      title: 'Brew potion batch',
      default_duration_min: 90,
      default_tags: [],
      default_constraints: { priority: 'High', earliest_start: '10:00', latest_end: '18:00' },
    },
    {
      id: 'demo-tmpl-3',
      title: 'Evening ritual',
      default_duration_min: 20,
      default_tags: [],
      default_constraints: { priority: 'Medium', earliest_start: '18:00', latest_end: '23:55' },
    },
    {
      id: 'demo-tmpl-4',
      title: 'Grimoire update',
      default_duration_min: 30,
      default_tags: [],
      default_constraints: { priority: 'Low' },
    },
  ]

  const anytimeTasks: AnytimeTask[] = [
    {
      id: 'demo-any-1',
      title: 'Reply to enchantment forum thread',
      rough_duration_min: 15,
      tags: [],
      completed: false,
    },
    {
      id: 'demo-any-2',
      title: 'Restock beeswax candles',
      rough_duration_min: 10,
      tags: [],
      completed: false,
    },
    {
      id: 'demo-any-3',
      title: 'Gerald needs a bath (he does NOT want this)',
      rough_duration_min: 20,
      tags: [],
      completed: false,
    },
  ]

  return { tasks, events, templates, anytimeTasks }
}

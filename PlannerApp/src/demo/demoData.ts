import type { TaskInstance, FixedEvent, TaskTemplate, AnytimeTask } from '../types'

export function createDemoSeed(day: string): {
  tasks: TaskInstance[]
  events: FixedEvent[]
  templates: TaskTemplate[]
  anytimeTasks: AnytimeTask[]
} {
  const tasks: TaskInstance[] = [
    // Completed tasks — show the day's history on the timeline
    {
      id: 'demo-t1',
      title: 'Review pull requests',
      duration_min: 45,
      earliest_start: '07:00',
      latest_end: '20:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '07:30',
      scheduled_end: '08:15',
      day,
    },
    {
      id: 'demo-t2',
      title: 'Morning emails & Slack',
      duration_min: 20,
      earliest_start: '07:00',
      latest_end: '20:00',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '08:20',
      scheduled_end: '08:40',
      day,
    },
    {
      id: 'demo-t3',
      title: 'Write unit tests — auth service',
      duration_min: 90,
      earliest_start: '07:00',
      latest_end: '23:00',
      priority: 'High',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '09:35',
      scheduled_end: '11:05',
      day,
    },
    {
      id: 'demo-t4',
      title: 'Update on-call runbook',
      duration_min: 30,
      earliest_start: '09:00',
      latest_end: '23:00',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'completed',
      scheduled_start: '13:05',
      scheduled_end: '13:35',
      day,
    },
    // Active tasks — small durations, wide windows so they schedule at any time of day
    {
      id: 'demo-t5',
      title: 'Performance metrics review',
      duration_min: 20,
      earliest_start: '07:00',
      latest_end: '23:55',
      priority: 'Medium',
      tags: [],
      splittable: false,
      status: 'not_scheduled',
      day,
    },
    {
      id: 'demo-t6',
      title: 'Clear inbox backlog',
      duration_min: 15,
      earliest_start: '07:00',
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

  // Task Bank templates — give the panel something to show
  const templates: TaskTemplate[] = [
    {
      id: 'demo-tmpl-1',
      title: 'Review pull requests',
      default_duration_min: 45,
      default_tags: [],
      default_constraints: { priority: 'High', earliest_start: '07:00', latest_end: '18:00' },
    },
    {
      id: 'demo-tmpl-2',
      title: 'Standup prep',
      default_duration_min: 15,
      default_tags: [],
      default_constraints: { priority: 'High', earliest_start: '07:00', latest_end: '09:00' },
    },
    {
      id: 'demo-tmpl-3',
      title: 'On-call runbook update',
      default_duration_min: 60,
      default_tags: [],
      default_constraints: { priority: 'Medium' },
    },
    {
      id: 'demo-tmpl-4',
      title: 'Weekly incident report',
      default_duration_min: 30,
      default_tags: [],
      default_constraints: { priority: 'Low' },
    },
  ]

  // Anytime tasks — give the right panel something to show
  const anytimeTasks: AnytimeTask[] = [
    {
      id: 'demo-any-1',
      title: 'Check Slack DMs',
      rough_duration_min: 10,
      tags: [],
      completed: false,
    },
    {
      id: 'demo-any-2',
      title: 'Review open tickets',
      rough_duration_min: 15,
      tags: [],
      completed: false,
    },
    {
      id: 'demo-any-3',
      title: 'Update JIRA board',
      rough_duration_min: 10,
      tags: [],
      completed: false,
    },
  ]

  return { tasks, events, templates, anytimeTasks }
}

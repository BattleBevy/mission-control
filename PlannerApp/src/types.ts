// ─── Primitives ───────────────────────────────────────────────────────────────

/** 24-hour time string: "07:00", "23:30", "00:00" */
export type TimeString = string

/** Calendar date string: "2026-05-25" */
export type DateString = string

export type Priority = 'Low' | 'Medium' | 'High'

export type TaskStatus =
  | 'not_scheduled'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'skipped'

// ─── Stored Entities (persisted in Firestore) ─────────────────────────────────

/** Reusable template; "Add to today" creates a TaskInstance from this */
export interface TaskTemplate {
  id: string
  title: string
  default_duration_min: number
  default_tags: string[]
  default_constraints: {
    earliest_start?: TimeString
    latest_end?: TimeString
    priority?: Priority
  }
  default_recurrence?: string
  start_date?: DateString  // recurrence fires on/after this date; absent on legacy templates (fire on all days)
  end_date?: DateString    // recurrence stops firing after this date; absent = no end
}

/** One occurrence of a task on a specific day */
export interface TaskInstance {
  id: string
  template_id?: string
  title: string
  duration_min: number
  earliest_start: TimeString
  latest_end: TimeString
  priority: Priority
  tags: string[]
  splittable: boolean // always false for MVP
  status: TaskStatus
  scheduled_start?: TimeString // set by engine after placement
  scheduled_end?: TimeString
  day: DateString
  recurrence?: string // post-MVP
}

/** Immovable event pinned to the timeline */
export interface FixedEvent {
  id: string
  title: string
  start_datetime: TimeString
  end_datetime: TimeString
  day: DateString
  notes?: string
  template_id?: string  // set when auto-generated from an EventTemplate
  all_day?: boolean     // label-only; does not block any time slot
}

/** Reusable template for a recurring fixed event */
export interface EventTemplate {
  id: string
  title: string
  start_time: TimeString
  end_time: TimeString
  notes?: string
  recurrence: string
  start_date?: DateString  // recurrence fires on/after this date; absent on legacy templates (fire on all days)
  end_date?: DateString    // recurrence stops firing after this date; absent = no end
  all_day?: boolean
}

/** Unscheduled to-do shown in the Anytime panel; never gets a timeline slot */
export interface AnytimeTask {
  id: string
  title: string
  rough_duration_min?: number
  tags: string[]
  completed: boolean
}

/** Full state of a single day; this is what gets saved to Firestore */
export interface DayPlan {
  day: DateString
  fixed_events: FixedEvent[]
  flexible_tasks: TaskInstance[]
  anytime_tasks: AnytimeTask[]
}

// ─── Engine I/O (computed on the fly; not persisted) ─────────────────────────

export interface WorkingHours {
  start: TimeString // "07:00"
  end: TimeString   // "00:00" (midnight — treated as 24:00 by engine)
}

export interface SchedulerInput {
  working_hours: WorkingHours
  fixed_events: FixedEvent[]
  flexible_tasks: TaskInstance[]
  current_time: TimeString
  day: DateString
}

/** A placed block on the rendered timeline (fixed event or scheduled flexible task) */
export interface ScheduledBlock {
  task_id: string
  title: string
  type: 'fixed' | 'flexible'
  start: TimeString
  end: TimeString
  status: TaskStatus
}

/** Free time between blocks; rendered as a gap on the timeline */
export interface GapBlock {
  type: 'gap'
  start: TimeString
  end: TimeString
  duration_min: number
}

export interface SchedulerOutput {
  scheduled: ScheduledBlock[]
  unscheduled: TaskInstance[]
  gaps: GapBlock[]
}

// ─── Suppressions (single-occurrence deletion for recurring items) ────────────

/** Records that a specific template should be skipped for a specific day */
export interface Suppression {
  id: string         // composite: "${template_id}-${day}"
  template_id: string
  day: DateString
}

// ─── Conflicts ────────────────────────────────────────────────────────────────

export type ConflictReason =
  | 'no_fitting_slot'          // task window open but no gap long enough
  | 'window_too_tight'         // allowed window is shorter than task duration
  | 'duration_exceeds_remaining' // not enough time left in the working day
  | 'window_passed'            // the entire allowed window is in the past

export interface ConflictItem {
  task: TaskInstance
  reason: ConflictReason
}

export interface ConflictSet {
  conflicts: ConflictItem[]
}

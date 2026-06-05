import {
  collection, doc, writeBatch, onSnapshot, setDoc, updateDoc, deleteDoc,
  getDocs, query, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { DayPlan, TaskInstance, FixedEvent, AnytimeTask, DateString, EventTemplate, Suppression } from '../types'
import { parseRecurrence, shouldFireOnDay } from '../engine/recurrence'

// ── In-memory undo (1-step) ───────────────────────────────────────────────────
// Stores a deep copy of the DayPlan before the last mutating action.
// Intentionally not persisted — losing it on page refresh is acceptable MVP behaviour.

let previousPlan: DayPlan | null = null

export function snapshotForUndo(plan: DayPlan): void {
  previousPlan = structuredClone(plan)
}

export function getPreviousPlan(): DayPlan | null {
  return previousPlan
}

// ── Aggregate real-time subscription ─────────────────────────────────────────
// Coordinates three separate onSnapshot listeners (tasks, events, anytime) and
// fires a single callback with the assembled DayPlan whenever any collection changes.

export function subscribeDayPlan(
  userId: string,
  day: DateString,
  onChange: (plan: DayPlan) => void,
): () => void {
  let tasks: TaskInstance[] = []
  let events: FixedEvent[] = []
  let eventTemplates: EventTemplate[] = []
  let anytime: AnytimeTask[] = []
  let suppressedEventTemplates: Set<string> = new Set()

  const emit = () => {
    // Materialize recurring event templates for this day in memory — no Firestore writes needed.
    // Skip any template suppressed for this specific day (single-occurrence deletion).
    const materialized: FixedEvent[] = eventTemplates.flatMap(t => {
      if (suppressedEventTemplates.has(t.id)) return []
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
        ...(t.tentative ? { tentative: true } : {}),
      }]
    })
    onChange({ day, fixed_events: [...events, ...materialized], flexible_tasks: tasks, anytime_tasks: anytime })
  }

  const unsub1 = onSnapshot(
    query(collection(db, 'users', userId, 'tasks'), where('day', '==', day)),
    snap => { tasks = snap.docs.map(d => d.data() as TaskInstance); emit() },
  )
  const unsub2 = onSnapshot(
    query(collection(db, 'users', userId, 'events'), where('day', '==', day)),
    snap => { events = snap.docs.map(d => d.data() as FixedEvent); emit() },
  )
  const unsub3 = onSnapshot(
    collection(db, 'users', userId, 'anytime'),
    snap => { anytime = snap.docs.map(d => d.data() as AnytimeTask); emit() },
  )
  const unsub4 = onSnapshot(
    collection(db, 'users', userId, 'event_templates'),
    snap => { eventTemplates = snap.docs.map(d => d.data() as EventTemplate); emit() },
  )
  const unsub5 = onSnapshot(
    query(collection(db, 'users', userId, 'event_suppressions'), where('day', '==', day)),
    snap => {
      suppressedEventTemplates = new Set(snap.docs.map(d => (d.data() as Suppression).template_id))
      emit()
    },
  )

  return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5() }
}

// ── Batch write — full DayPlan at once ───────────────────────────────────────
// Used by the undo action and any operation that needs to atomically replace the
// entire day state. Max 500 ops per batch — safe for MVP (< 200 tasks/day).

export async function saveDayPlan(userId: string, plan: DayPlan): Promise<void> {
  const batch = writeBatch(db)

  for (const task of plan.flexible_tasks) {
    batch.set(doc(db, 'users', userId, 'tasks', task.id), task)
  }
  for (const event of plan.fixed_events.filter(e => !e.template_id)) {
    batch.set(doc(db, 'users', userId, 'events', event.id), event)
  }
  for (const at of plan.anytime_tasks) {
    batch.set(doc(db, 'users', userId, 'anytime', at.id), at)
  }

  await batch.commit()
}

// ── Delete all docs for a specific day (tasks + events only; anytime is global) ──
// Used by undo to wipe the current day before restoring the previous snapshot.

export async function deleteDayData(userId: string, day: DateString): Promise<void> {
  const [taskSnap, eventSnap] = await Promise.all([
    getDocs(query(collection(db, 'users', userId, 'tasks'), where('day', '==', day))),
    getDocs(query(collection(db, 'users', userId, 'events'), where('day', '==', day))),
  ])
  await Promise.all([
    ...taskSnap.docs.map(d => deleteDoc(d.ref)),
    ...eventSnap.docs.map(d => deleteDoc(d.ref)),
  ])
}

// ── AnytimeTask CRUD ──────────────────────────────────────────────────────────
// Anytime tasks have no day field — they're a global list for the user.

export async function saveAnytimeTask(userId: string, task: AnytimeTask): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'anytime', task.id), task)
}

export async function updateAnytimeTask(
  userId: string,
  id: string,
  changes: Partial<AnytimeTask>,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'anytime', id), changes as Record<string, unknown>)
}

export async function deleteAnytimeTask(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'anytime', id))
}

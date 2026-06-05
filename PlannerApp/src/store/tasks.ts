import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
  query, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { TaskInstance, DateString } from '../types'

const col = (userId: string) => collection(db, 'users', userId, 'tasks')

/** Real-time listener for all TaskInstances on a given day. Returns unsubscribe fn. */
export function subscribeTasks(
  userId: string,
  day: DateString,
  onChange: (tasks: TaskInstance[]) => void,
): () => void {
  const q = query(col(userId), where('day', '==', day))
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => d.data() as TaskInstance))
  })
}

/** Create or overwrite a TaskInstance document. */
export async function saveTask(userId: string, task: TaskInstance): Promise<void> {
  await setDoc(doc(col(userId), task.id), task)
}

/** Partial update — only the supplied fields are written. */
export async function updateTask(
  userId: string,
  id: string,
  changes: Partial<TaskInstance>,
): Promise<void> {
  await updateDoc(doc(col(userId), id), changes as Record<string, unknown>)
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(col(userId), id))
}

/** Move a task to a different day: saves a fresh copy on toDay and deletes the original. */
export async function moveTask(
  userId: string,
  task: TaskInstance,
  toDay: string,
): Promise<void> {
  // Build explicitly — never spread optional fields that might be undefined.
  // Firestore SDK v9 rejects any key whose value is undefined.
  const moved: TaskInstance = {
    id: crypto.randomUUID(),
    title: task.title,
    duration_min: task.duration_min,
    earliest_start: task.earliest_start,
    latest_end: task.latest_end,
    priority: task.priority,
    tags: task.tags,
    splittable: task.splittable,
    status: 'not_scheduled',
    day: toDay,
    ...(task.template_id ? { template_id: task.template_id } : {}),
    ...(task.recurrence ? { recurrence: task.recurrence } : {}),
  }
  await setDoc(doc(col(userId), moved.id), moved)
  await deleteDoc(doc(col(userId), task.id))
}

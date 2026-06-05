import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Suppression, DateString } from '../types'

const eventCol = (userId: string) => collection(db, 'users', userId, 'event_suppressions')
const taskCol = (userId: string) => collection(db, 'users', userId, 'task_suppressions')

export async function suppressEventOccurrence(userId: string, templateId: string, day: DateString): Promise<void> {
  const id = `${templateId}-${day}`
  await setDoc(doc(eventCol(userId), id), { id, template_id: templateId, day } satisfies Suppression)
}

export async function suppressTaskOccurrence(userId: string, templateId: string, day: DateString): Promise<void> {
  const id = `${templateId}-${day}`
  await setDoc(doc(taskCol(userId), id), { id, template_id: templateId, day } satisfies Suppression)
}

export async function deleteEventSuppression(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(eventCol(userId), id))
}

export async function deleteTaskSuppression(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(taskCol(userId), id))
}

export function subscribeTaskSuppressions(
  userId: string,
  day: DateString,
  onChange: (suppressedTemplateIds: Set<string>) => void,
): () => void {
  return onSnapshot(
    query(taskCol(userId), where('day', '==', day)),
    snap => {
      onChange(new Set(snap.docs.map(d => (d.data() as Suppression).template_id)))
    },
  )
}

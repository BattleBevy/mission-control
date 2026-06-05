import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { EventTemplate } from '../types'

const col = (userId: string) => collection(db, 'users', userId, 'event_templates')

export function subscribeEventTemplates(
  userId: string,
  onChange: (templates: EventTemplate[]) => void,
): () => void {
  return onSnapshot(col(userId), snap => {
    onChange(snap.docs.map(d => d.data() as EventTemplate))
  })
}

export async function saveEventTemplate(userId: string, template: EventTemplate): Promise<void> {
  await setDoc(doc(col(userId), template.id), template)
}

export async function updateEventTemplate(
  userId: string,
  id: string,
  changes: Partial<EventTemplate>,
): Promise<void> {
  await updateDoc(doc(col(userId), id), changes as Record<string, unknown>)
}

export async function deleteEventTemplate(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(col(userId), id))
}

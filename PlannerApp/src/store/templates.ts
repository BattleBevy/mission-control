import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { TaskTemplate } from '../types'

const col = (userId: string) => collection(db, 'users', userId, 'templates')

/** Real-time listener for all TaskTemplates (not day-filtered — templates are global). */
export function subscribeTemplates(
  userId: string,
  onChange: (templates: TaskTemplate[]) => void,
): () => void {
  return onSnapshot(col(userId), snap => {
    onChange(snap.docs.map(d => d.data() as TaskTemplate))
  })
}

/** Create or overwrite a TaskTemplate document. */
export async function saveTemplate(userId: string, template: TaskTemplate): Promise<void> {
  await setDoc(doc(col(userId), template.id), template)
}

export async function updateTemplate(
  userId: string,
  id: string,
  changes: Partial<TaskTemplate>,
): Promise<void> {
  await updateDoc(doc(col(userId), id), changes as Record<string, unknown>)
}

export async function deleteTemplate(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(col(userId), id))
}

import {
  collection, doc, onSnapshot, setDoc, deleteDoc,
  query, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { FixedEvent, DateString } from '../types'

const col = (userId: string) => collection(db, 'users', userId, 'events')

/** Real-time listener for all FixedEvents on a given day. Returns unsubscribe fn. */
export function subscribeEvents(
  userId: string,
  day: DateString,
  onChange: (events: FixedEvent[]) => void,
): () => void {
  const q = query(col(userId), where('day', '==', day))
  return onSnapshot(q, snap => {
    onChange(snap.docs.map(d => d.data() as FixedEvent))
  })
}

/** Create or overwrite a FixedEvent document. */
export async function saveEvent(userId: string, event: FixedEvent): Promise<void> {
  await setDoc(doc(col(userId), event.id), event)
}

export async function deleteEvent(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(col(userId), id))
}

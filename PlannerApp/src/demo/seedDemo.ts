import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { createDemoSeed } from './demoData'

export async function seedDemoIfEmpty(userId: string, day: string): Promise<void> {
  const taskCol = collection(db, 'users', userId, 'tasks')
  const existing = await getDocs(query(taskCol, where('day', '==', day)))
  if (!existing.empty) return

  const { tasks, events } = createDemoSeed(day)
  const batch = writeBatch(db)

  for (const t of tasks) {
    batch.set(doc(db, 'users', userId, 'tasks', t.id), t)
  }
  for (const e of events) {
    batch.set(doc(db, 'users', userId, 'events', e.id), e)
  }

  await batch.commit()
}

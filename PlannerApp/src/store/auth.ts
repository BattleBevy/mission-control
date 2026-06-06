import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  inMemoryPersistence,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase'

const provider = new GoogleAuthProvider()

export function signIn(): Promise<void> {
  return signInWithPopup(auth, provider).then(() => undefined)
}

export async function signInAnon(): Promise<void> {
  await setPersistence(auth, inMemoryPersistence)
  await signInAnonymously(auth)
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}

/** Subscribe to auth state. Returns unsubscribe fn. */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}

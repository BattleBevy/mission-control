import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../firebase'

const provider = new GoogleAuthProvider()

export function signIn(): Promise<void> {
  return signInWithPopup(auth, provider).then(() => undefined)
}

export function signInAnon(): Promise<void> {
  return signInAnonymously(auth).then(() => undefined)
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

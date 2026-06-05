import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange } from '../store/auth'

/** Returns undefined while auth is resolving, null when signed out, User when signed in. */
export function useAuth(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onAuthChange(setUser), [])
  return user
}

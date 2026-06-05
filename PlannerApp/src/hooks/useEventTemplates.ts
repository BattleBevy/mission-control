import { useState, useEffect } from 'react'
import type { EventTemplate } from '../types'
import { subscribeEventTemplates } from '../store/eventTemplates'

export function useEventTemplates(userId: string): EventTemplate[] {
  const [templates, setTemplates] = useState<EventTemplate[]>([])
  useEffect(() => subscribeEventTemplates(userId, setTemplates), [userId])
  return templates
}

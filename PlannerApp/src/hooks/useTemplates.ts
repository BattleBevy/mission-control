import { useState, useEffect } from 'react'
import type { TaskTemplate } from '../types'
import { subscribeTemplates } from '../store/templates'

export function useTemplates(userId: string): TaskTemplate[] {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  useEffect(() => subscribeTemplates(userId, setTemplates), [userId])
  return templates
}

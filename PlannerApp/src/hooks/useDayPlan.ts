import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { DayPlan, SchedulerOutput, ConflictSet } from '../types'
import { subscribeDayPlan, deleteDayData, saveDayPlan } from '../store/day'
import { updateTask } from '../store/tasks'
import { subscribeTaskSuppressions, deleteEventSuppression, deleteTaskSuppression } from '../store/suppressions'
import { recalculate as engineRecalculate, DEFAULT_WORKING_HOURS } from '../engine/recalculate'
import { runScheduler } from '../engine/scheduler'
import { detectConflicts } from '../engine/conflicts'

export function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nowString(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Tracks a suppression doc written as part of an action so undo can delete it. */
export interface SuppressionRef {
  id: string
  type: 'event' | 'task'
}

export interface DayPlanState {
  plan: DayPlan | null
  scheduled: SchedulerOutput | null
  conflicts: ConflictSet | null
  loading: boolean
  recalculate: () => void
  snapshot: (suppression?: SuppressionRef) => void
  canUndo: boolean
  undo: () => Promise<void>
  suppressedTaskTemplateIds: Set<string>
}

export function useDayPlan(userId: string, day: string): DayPlanState {
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalcKey, setRecalcKey] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [suppressedTaskTemplateIds, setSuppressedTaskTemplateIds] = useState<Set<string>>(new Set())
  const [serverConfirmed, setServerConfirmed] = useState(false)
  const undoPlanRef = useRef<DayPlan | null>(null)
  const undoSuppressionRef = useRef<SuppressionRef | null>(null)

  useEffect(() => {
    setPlan(null)
    setLoading(true)
    setServerConfirmed(false)
    undoPlanRef.current = null
    undoSuppressionRef.current = null
    setCanUndo(false)
    return subscribeDayPlan(userId, day, (p, confirmed) => {
      setServerConfirmed(confirmed)
      setPlan(p)
      setLoading(false)
    })
  }, [userId, day])

  useEffect(() => {
    setSuppressedTaskTemplateIds(new Set())
    return subscribeTaskSuppressions(userId, day, setSuppressedTaskTemplateIds)
  }, [userId, day])

  const scheduled = useMemo(() => {
    if (!plan) return null
    if (day === todayString()) {
      return engineRecalculate(plan, nowString())
    }
    return runScheduler({
      working_hours: DEFAULT_WORKING_HOURS,
      fixed_events: plan.fixed_events,
      flexible_tasks: plan.flexible_tasks,
      current_time: DEFAULT_WORKING_HOURS.start,
      day: plan.day,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, day, recalcKey])

  // Persist scheduled positions to Firestore so the freeze check survives page refreshes.
  // Only runs for today; only writes tasks whose stored position differs from the new schedule.
  // Natural loop-break: after one write, Firestore updates plan, scheduler re-runs with the same
  // output (freeze check now catches the task), comparison finds no difference → no second write.
  useEffect(() => {
    if (!scheduled || !plan || day !== todayString() || !serverConfirmed) return
    const blocksById = new Map(
      scheduled.scheduled
        .filter(b => b.type === 'flexible')
        .map(b => [b.task_id, b]),
    )
    plan.flexible_tasks.forEach(task => {
      const block = blocksById.get(task.id)
      if (!block) return
      if (task.scheduled_start === block.start && task.scheduled_end === block.end) return
      // Don't persist a position that's already at or before now — the task would freeze
      // immediately. The scheduler will keep placing it fresh until its stored time arrives.
      if (block.start <= nowString()) return
      updateTask(userId, task.id, { scheduled_start: block.start, scheduled_end: block.end })
    })
  }, [scheduled, plan, userId, day, serverConfirmed])

  const conflicts = useMemo(() => {
    if (!scheduled) return null
    const now = day === todayString() ? nowString() : undefined
    return detectConflicts(scheduled, now)
  }, [scheduled, day])

  const recalculate = () => setRecalcKey(k => k + 1)

  const snapshot = useCallback((suppression?: SuppressionRef) => {
    if (plan) {
      undoPlanRef.current = structuredClone(plan)
      undoSuppressionRef.current = suppression ?? null
      setCanUndo(true)
    }
  }, [plan])

  const undo = useCallback(async () => {
    const previous = undoPlanRef.current
    if (!previous) return
    const supp = undoSuppressionRef.current
    undoPlanRef.current = null
    undoSuppressionRef.current = null
    setCanUndo(false)
    // Delete the tracked suppression before restoring the plan so the recurring
    // event/task can materialize again immediately after saveDayPlan fires.
    if (supp) {
      if (supp.type === 'event') await deleteEventSuppression(userId, supp.id)
      else await deleteTaskSuppression(userId, supp.id)
    }
    await deleteDayData(userId, day)
    await saveDayPlan(userId, previous)
    setRecalcKey(k => k + 1)
  }, [userId, day])

  return { plan, scheduled, conflicts, loading, recalculate, snapshot, canUndo, undo, suppressedTaskTemplateIds }
}

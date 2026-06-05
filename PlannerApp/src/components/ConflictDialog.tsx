import { useState } from 'react'
import type { TaskInstance, ConflictSet } from '../types'
import { deleteTask, updateTask, moveTask } from '../store/tasks'
import { suppressTaskOccurrence } from '../store/suppressions'
import type { SuppressionRef } from '../hooks/useDayPlan'

const REASON_LABELS: Record<string, string> = {
  no_fitting_slot: 'No gap long enough',
  window_too_tight: 'Window shorter than duration',
  duration_exceeds_remaining: 'Not enough time left today',
  window_passed: 'Time window already passed',
}

function offsetDay(day: string, delta: number): string {
  const d = new Date(day + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  tasks: TaskInstance[]
  conflicts: ConflictSet | null
  userId: string
  onDismiss: () => void
  onSnapshot: (suppression?: SuppressionRef) => void
  swappableTasks: TaskInstance[]
}

export function ConflictDialog({ tasks, conflicts, userId, onDismiss, onSnapshot, swappableTasks }: Props) {
  const [shorteningId, setShorteningId] = useState<string | null>(null)
  const [newDuration, setNewDuration] = useState('')
  const [swapModeId, setSwapModeId] = useState<string | null>(null)

  if (tasks.length === 0) return null

  const reasonMap = new Map(
    (conflicts?.conflicts ?? []).map(c => [c.task.id, c.reason]),
  )

  async function handleMoveToTomorrow(task: TaskInstance) {
    onSnapshot()
    await moveTask(userId, task, offsetDay(task.day, 1))
  }

  async function handleSwap(scheduledTask: TaskInstance) {
    onSnapshot()
    await moveTask(userId, scheduledTask, offsetDay(scheduledTask.day, 1))
    setSwapModeId(null)
  }

  async function handleDelete(task: TaskInstance) {
    if (task.template_id) {
      onSnapshot({ id: `${task.template_id}-${task.day}`, type: 'task' })
      await suppressTaskOccurrence(userId, task.template_id, task.day)
    } else {
      onSnapshot()
    }
    await deleteTask(userId, task.id)
  }

  async function handleShorten(task: TaskInstance) {
    const duration = parseInt(newDuration, 10)
    if (!duration || duration <= 0) return
    onSnapshot()
    await updateTask(userId, task.id, { duration_min: duration })
    setShorteningId(null)
    setNewDuration('')
  }

  function startShorten(task: TaskInstance) {
    setShorteningId(task.id)
    setNewDuration(String(task.duration_min))
    setSwapModeId(null)
  }

  function toggleSwap(taskId: string) {
    setSwapModeId(id => id === taskId ? null : taskId)
    setShorteningId(null)
    setNewDuration('')
  }

  return (
    <div className="conflict-overlay" onClick={onDismiss}>
      <div className="conflict-dialog" onClick={e => e.stopPropagation()}>
        <div className="conflict-dialog-header">
          <h2 className="conflict-dialog-title">Scheduling Conflicts</h2>
          <button className="btn-icon" onClick={onDismiss} title="Dismiss">✕</button>
        </div>
        <p className="conflict-dialog-subtitle">
          {tasks.length} task{tasks.length > 1 ? 's' : ''} could not be placed. Choose what to do with each.
        </p>

        <ul className="conflict-list">
          {tasks.map(t => (
            <li key={t.id} className="conflict-item">
              <div className="conflict-item-info">
                <span className="conflict-item-title">{t.title}</span>
                <span className="conflict-item-meta">
                  {t.duration_min} min · {REASON_LABELS[reasonMap.get(t.id) ?? ''] ?? 'Cannot be scheduled'}
                </span>
              </div>

              {shorteningId === t.id ? (
                <div className="conflict-shorten-form">
                  <input
                    className="form-input conflict-duration-input"
                    type="number"
                    min={5}
                    step={5}
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    autoFocus
                  />
                  <span className="conflict-duration-label">min</span>
                  <button className="btn-save" onClick={() => handleShorten(t)}>Save</button>
                  <button className="btn-cancel" onClick={() => setShorteningId(null)}>✕</button>
                </div>
              ) : (
                <div className="conflict-item-actions">
                  <button className="btn-conflict btn-conflict-tomorrow" onClick={() => handleMoveToTomorrow(t)}>→ Tomorrow</button>
                  <button className="btn-conflict btn-shorten" onClick={() => startShorten(t)}>Shorten</button>
                  {swappableTasks.length > 0 && (
                    <button
                      className={`btn-conflict btn-swap${swapModeId === t.id ? ' active' : ''}`}
                      onClick={() => toggleSwap(t.id)}
                    >
                      Swap
                    </button>
                  )}
                  <button className="btn-conflict btn-drop" onClick={() => handleDelete(t)}>Delete</button>
                </div>
              )}

              {swapModeId === t.id && (
                <div className="swap-panel">
                  <p className="swap-panel-label">Move to tomorrow to free its slot:</p>
                  <ul className="swap-list">
                    {swappableTasks.map(s => (
                      <li key={s.id} className="swap-item">
                        <span className="swap-item-title">{s.title}</span>
                        <span className="swap-item-meta">{s.duration_min} min · {s.priority}</span>
                        <button className="btn-swap-confirm" onClick={() => handleSwap(s)}>
                          → Tomorrow
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

import type { TaskInstance, ConflictSet } from '../types'
import { deleteTask, moveTask } from '../store/tasks'
import { suppressTaskOccurrence } from '../store/suppressions'
import type { SuppressionRef } from '../hooks/useDayPlan'

const REASON_LABELS: Record<string, string> = {
  no_fitting_slot: 'no gap long enough',
  window_too_tight: 'window shorter than duration',
  duration_exceeds_remaining: 'not enough time left today',
  window_passed: 'time window already passed',
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
  onSnapshot: (suppression?: SuppressionRef) => void
}

export function UnscheduledList({ tasks, conflicts, userId, onSnapshot }: Props) {
  if (tasks.length === 0) return null

  const reasonMap = new Map(
    (conflicts?.conflicts ?? []).map(c => [c.task.id, c.reason]),
  )

  async function handleMove(t: TaskInstance) {
    onSnapshot()
    await moveTask(userId, t, offsetDay(t.day, 1))
  }

  async function handleMoveAll() {
    onSnapshot()
    await Promise.all(tasks.map(t => moveTask(userId, t, offsetDay(t.day, 1))))
  }

  async function handleRemove(t: TaskInstance) {
    if (t.template_id) {
      onSnapshot({ id: `${t.template_id}-${t.day}`, type: 'task' })
      await suppressTaskOccurrence(userId, t.template_id, t.day)
    } else {
      onSnapshot()
    }
    await deleteTask(userId, t.id)
  }

  return (
    <div className="unscheduled-list">
      <div className="unscheduled-header">
        <h3 className="unscheduled-title">Could not schedule</h3>
        {tasks.length > 1 && (
          <button className="btn-move-all" onClick={handleMoveAll}>
            → Tomorrow (all {tasks.length})
          </button>
        )}
      </div>
      <ul>
        {tasks.map(t => (
          <li key={t.id} className="unscheduled-item">
            <span className="unscheduled-task-title">{t.title}</span>
            <span className="unscheduled-duration">{t.duration_min} min</span>
            {reasonMap.has(t.id) && (
              <span className="unscheduled-reason">
                {REASON_LABELS[reasonMap.get(t.id)!] ?? reasonMap.get(t.id)}
              </span>
            )}
            <button className="btn-move-tomorrow" onClick={() => handleMove(t)} title="Move to tomorrow">
              → Tomorrow
            </button>
            <button
              className="btn-remove"
              onClick={() => handleRemove(t)}
              title="Remove task"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

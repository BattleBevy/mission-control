import { updateTask } from '../store/tasks'
import type { TaskInstance } from '../types'
import type { SuppressionRef } from '../hooks/useDayPlan'

interface Props {
  task: TaskInstance
  userId: string
  onSnapshot: (suppression?: SuppressionRef) => void
}

export function OverduePrompt({ task, userId, onSnapshot }: Props) {
  async function handleDone() {
    onSnapshot()
    await updateTask(userId, task.id, { status: 'completed' })
  }

  async function handleWorking() {
    onSnapshot()
    await updateTask(userId, task.id, { status: 'in_progress' })
  }

  async function handleSkip() {
    onSnapshot()
    await updateTask(userId, task.id, { status: 'skipped' })
  }

  return (
    <div className="overdue-overlay">
      <div className="overdue-dialog">
        <div className="overdue-header">
          <span className="overdue-title">Time check</span>
        </div>
        <p className="overdue-task-name">{task.title}</p>
        <p className="overdue-subtitle">
          Was scheduled to end at {task.scheduled_end} — what happened?
        </p>
        <div className="overdue-actions">
          <button className="btn-action btn-complete" onClick={handleDone}>✓ Done</button>
          <button className="btn-action btn-pause" onClick={handleWorking}>⏵ Still working</button>
          <button className="btn-action btn-skip" onClick={handleSkip}>Skip</button>
        </div>
      </div>
    </div>
  )
}

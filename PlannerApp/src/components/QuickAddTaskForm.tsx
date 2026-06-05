import { useState } from 'react'
import type { TaskInstance, Priority } from '../types'
import { saveTask } from '../store/tasks'

interface Props {
  userId: string
  day: string
  onClose: () => void
}

export function QuickAddTaskForm({ userId, day, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState('30')
  const [priority, setPriority] = useState<Priority>('Medium')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const task: TaskInstance = {
      id: crypto.randomUUID(),
      title: title.trim(),
      duration_min: parseInt(duration, 10),
      earliest_start: '07:00',
      latest_end: '00:00',
      priority,
      tags: [],
      splittable: false,
      status: 'not_scheduled',
      day,
    }
    await saveTask(userId, task)
    onClose()
  }

  return (
    <form className="inline-form event-form" onSubmit={handleSave}>
      <div className="event-form-header">
        <span className="event-form-title">Add task</span>
        <button type="button" className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <input
        className="form-input"
        placeholder="Task name"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        required
      />
      <div className="form-row">
        <label className="form-label">
          Duration (min)
          <input
            className="form-input"
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={e => setDuration(e.target.value)}
            required
          />
        </label>
        <label className="form-label">
          Priority
          <select
            className="form-input"
            value={priority}
            onChange={e => setPriority(e.target.value as Priority)}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-save">Add</button>
        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

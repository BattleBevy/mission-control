import { useState } from 'react'
import type { AnytimeTask } from '../types'
import { updateAnytimeTask, saveAnytimeTask, deleteAnytimeTask } from '../store/day'

interface Props {
  userId: string
  tasks: AnytimeTask[]
}

export function AnytimePanel({ userId, tasks }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')

  function markDone(id: string) {
    updateAnytimeTask(userId, id, { completed: true })
  }

  function clearDone() {
    completed.forEach(t => deleteAnytimeTask(userId, t.id))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const task: AnytimeTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      tags: [],
      completed: false,
    }
    await saveAnytimeTask(userId, task)
    setTitle('')
    setShowForm(false)
  }

  const incomplete = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  return (
    <aside className="panel panel-anytime">
      <div className="panel-header">
        <h2 className="panel-title">Anytime</h2>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {completed.length > 0 && (
            <button className="btn-icon" onClick={clearDone} title="Clear completed tasks">✓✕</button>
          )}
          <button className="btn-icon" onClick={() => setShowForm(v => !v)} title="New task">+</button>
        </div>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleAdd}>
          <input
            className="form-input"
            placeholder="Task name"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            required
          />
          <div className="form-actions">
            <button type="submit" className="btn-save">Add</button>
            <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); setTitle('') }}>Cancel</button>
          </div>
        </form>
      )}

      {tasks.length === 0 && !showForm ? (
        <p className="placeholder-text">No anytime tasks. Press + to add one.</p>
      ) : (
        <ul className="anytime-list">
          {incomplete.map(t => (
            <li key={t.id} className="anytime-item">
              <span className="anytime-title">{t.title}</span>
              <button className="btn-done" onClick={() => markDone(t.id)}>Done</button>
            </li>
          ))}
          {completed.map(t => (
            <li key={t.id} className="anytime-item completed">
              <span className="anytime-title">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

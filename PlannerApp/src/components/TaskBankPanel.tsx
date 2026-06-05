import { useState } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { saveTask } from '../store/tasks'
import { saveTemplate, deleteTemplate } from '../store/templates'
import { createInstance, parseRecurrence, buildRecurrenceString } from '../engine/recurrence'
import type { TaskTemplate, Priority } from '../types'

const WORKING_DAY_MINUTES = 1020  // 07:00–00:00

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type RecurrenceType = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly_date' | 'monthly_weekday'

interface TemplateForm {
  title: string
  duration: string
  priority: Priority
  earliest_start: string
  latest_end: string
  recurrence_type: RecurrenceType
  recurrence_days: number[]
  monthly_date: number   // 1–31, for monthly_date type
  monthly_nth: number    // 1–4, for monthly_weekday type
}

const BLANK_FORM: TemplateForm = {
  title: '',
  duration: '30',
  priority: 'Medium',
  earliest_start: '07:00',
  latest_end: '00:00',
  recurrence_type: 'never',
  recurrence_days: [],
  monthly_date: 1,
  monthly_nth: 1,
}

function templateToForm(t: TaskTemplate): TemplateForm {
  let recurrence_type: RecurrenceType = 'never'
  let recurrence_days: number[] = []
  let monthly_date = 1
  let monthly_nth = 1
  if (t.default_recurrence) {
    const rule = parseRecurrence(t.default_recurrence)
    if (rule) {
      recurrence_type = rule.type as RecurrenceType
      recurrence_days = rule.days ?? []
      if (rule.date != null) monthly_date = rule.date
      if (rule.nth != null) monthly_nth = rule.nth
    }
  }
  return {
    title: t.title,
    duration: String(t.default_duration_min),
    priority: t.default_constraints.priority ?? 'Medium',
    earliest_start: t.default_constraints.earliest_start ?? '07:00',
    latest_end: t.default_constraints.latest_end === '00:00' ? '00:00' : (t.default_constraints.latest_end ?? '00:00'),
    recurrence_type,
    recurrence_days,
    monthly_date,
    monthly_nth,
  }
}

function formToTemplate(
  form: TemplateForm,
  id: string,
  existingTags: string[],
  existingStartDate?: string,
): TaskTemplate {
  const anchor = existingStartDate ?? todayString()
  const recurrence = buildRecurrenceString(
    form.recurrence_type,
    form.recurrence_days,
    form.recurrence_type === 'biweekly' ? anchor : undefined,
    form.recurrence_type === 'monthly_date' ? form.monthly_date : undefined,
    form.recurrence_type === 'monthly_weekday' ? form.monthly_nth : undefined,
  )
  return {
    id,
    title: form.title.trim(),
    default_duration_min: parseInt(form.duration, 10),
    default_tags: existingTags,
    default_constraints: {
      earliest_start: form.earliest_start,
      latest_end: form.latest_end,
      priority: form.priority,
    },
    // Omit default_recurrence and start_date entirely when there's no recurrence —
    // Firestore rejects undefined values, so we use conditional spreading instead.
    // For biweekly tasks the anchor = start_date (creation date determines week parity)
    ...(recurrence ? {
      default_recurrence: recurrence,
      start_date: existingStartDate ?? todayString(),
    } : {}),
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function recurrenceLabel(t: TaskTemplate): string {
  if (!t.default_recurrence) return ''
  const rule = parseRecurrence(t.default_recurrence)
  if (!rule) return ''
  if (rule.type === 'daily') return ' · Daily'
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  if (rule.type === 'weekly') {
    const days = (rule.days ?? []).map(d => names[d]).join(' ')
    return ` · ${days}`
  }
  if (rule.type === 'biweekly') {
    const days = (rule.days ?? []).map(d => names[d]).join(' ')
    return ` · Alt ${days}`
  }
  if (rule.type === 'monthly_date') {
    return ` · ${ordinal(rule.date ?? 1)} of month`
  }
  if (rule.type === 'monthly_weekday') {
    const nth = ['', '1st', '2nd', '3rd', '4th'][rule.nth ?? 1] ?? '1st'
    const day = names[rule.days?.[0] ?? 0]
    return ` · ${nth} ${day}`
  }
  return ''
}

interface Props {
  userId: string
}

export function TaskBankPanel({ userId }: Props) {
  const allTemplates = useTemplates(userId)
  const today = todayString()
  // Hide templates whose series has ended (end_date is in the past)
  const templates = allTemplates.filter(t => !t.end_date || t.end_date >= today)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TemplateForm>(BLANK_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TemplateForm>(BLANK_FORM)
  const [warnId, setWarnId] = useState<string | null>(null)

  function addToToday(template: TaskTemplate) {
    if (template.default_duration_min > WORKING_DAY_MINUTES) {
      setWarnId(template.id)
      return
    }
    setWarnId(null)
    saveTask(userId, createInstance(template, todayString()))
  }

  function startEdit(t: TaskTemplate) {
    setEditingId(t.id)
    setEditForm(templateToForm(t))
    setShowForm(false)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleEditSave(templateId: string) {
    const original = templates.find(t => t.id === templateId)
    await saveTemplate(userId, formToTemplate(editForm, templateId, original?.default_tags ?? [], original?.start_date))
    setEditingId(null)
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault()
    await saveTemplate(userId, formToTemplate(form, crypto.randomUUID(), []))
    setForm(BLANK_FORM)
    setShowForm(false)
  }

  function toggleDay(days: number[], day: number): number[] {
    return days.includes(day) ? days.filter(d => d !== day) : [...days, day]
  }

  function RecurrenceFields({ value, onChange }: {
    value: TemplateForm
    onChange: (f: TemplateForm) => void
  }) {
    return (
      <>
        <label className="form-label">
          Repeats
          <select
            className="form-input"
            value={value.recurrence_type}
            onChange={e => onChange({ ...value, recurrence_type: e.target.value as RecurrenceType, recurrence_days: [] })}
          >
            <option value="never">Never</option>
            <option value="daily">Every day</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every other week</option>
            <option value="monthly_date">Monthly (same date)</option>
            <option value="monthly_weekday">Monthly (nth weekday)</option>
          </select>
        </label>
        {(value.recurrence_type === 'weekly' || value.recurrence_type === 'biweekly') && (
          <div className="recurrence-days">
            {DAY_LABELS.map((label, i) => {
              const day = (i + 1) % 7
              return (
                <button
                  key={day}
                  type="button"
                  className={`btn-day-toggle ${value.recurrence_days.includes(day) ? 'active' : ''}`}
                  onClick={() => onChange({ ...value, recurrence_days: toggleDay(value.recurrence_days, day) })}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
        {value.recurrence_type === 'monthly_date' && (
          <label className="form-label">
            Day of month
            <input
              className="form-input"
              type="number"
              min={1}
              max={31}
              value={value.monthly_date}
              onChange={e => onChange({ ...value, monthly_date: parseInt(e.target.value, 10) || 1 })}
            />
          </label>
        )}
        {value.recurrence_type === 'monthly_weekday' && (
          <>
            <label className="form-label">
              Which occurrence
              <select
                className="form-input"
                value={value.monthly_nth}
                onChange={e => onChange({ ...value, monthly_nth: parseInt(e.target.value, 10) })}
              >
                <option value={1}>1st</option>
                <option value={2}>2nd</option>
                <option value={3}>3rd</option>
                <option value={4}>4th</option>
              </select>
            </label>
            <div className="recurrence-days">
              {DAY_LABELS.map((label, i) => {
                const day = (i + 1) % 7
                return (
                  <button
                    key={day}
                    type="button"
                    className={`btn-day-toggle ${value.recurrence_days.includes(day) ? 'active' : ''}`}
                    onClick={() => onChange({ ...value, recurrence_days: [day] })}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <aside className="panel panel-bank">
      <div className="panel-header">
        <h2 className="panel-title">Task Bank</h2>
        <button className="btn-icon" onClick={() => { setShowForm(v => !v); setEditingId(null) }} title="New template">+</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleSaveTemplate}>
          <input
            className="form-input"
            placeholder="Task name"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
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
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                required
              />
            </label>
            <label className="form-label">
              Priority
              <select
                className="form-input"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label className="form-label">
              Earliest
              <input
                className="form-input"
                type="time"
                value={form.earliest_start}
                onChange={e => setForm(f => ({ ...f, earliest_start: e.target.value }))}
              />
            </label>
            <label className="form-label">
              Latest end
              <input
                className="form-input"
                type="time"
                value={form.latest_end === '00:00' ? '23:59' : form.latest_end}
                onChange={e => setForm(f => ({ ...f, latest_end: e.target.value === '23:59' ? '00:00' : e.target.value }))}
              />
            </label>
          </div>
          <RecurrenceFields value={form} onChange={setForm} />
          <div className="form-actions">
            <button type="submit" className="btn-save">Save</button>
            <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); setForm(BLANK_FORM) }}>Cancel</button>
          </div>
        </form>
      )}

      {templates.length === 0 && !showForm ? (
        <p className="placeholder-text">No templates yet. Press + to add one.</p>
      ) : (
        <ul className="bank-list">
          {templates.map(t => (
            <li key={t.id} className="bank-item bank-item--col">
              {editingId === t.id ? (
                <div className="inline-form">
                  <input
                    className="form-input"
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    required
                    autoFocus
                  />
                  <div className="form-row">
                    <label className="form-label">
                      Duration (min)
                      <input
                        className="form-input"
                        type="number"
                        min={5}
                        step={5}
                        value={editForm.duration}
                        onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))}
                      />
                    </label>
                    <label className="form-label">
                      Priority
                      <select
                        className="form-input"
                        value={editForm.priority}
                        onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as Priority }))}
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="form-label">
                      Earliest
                      <input
                        className="form-input"
                        type="time"
                        value={editForm.earliest_start}
                        onChange={e => setEditForm(f => ({ ...f, earliest_start: e.target.value }))}
                      />
                    </label>
                    <label className="form-label">
                      Latest end
                      <input
                        className="form-input"
                        type="time"
                        value={editForm.latest_end === '00:00' ? '23:59' : editForm.latest_end}
                        onChange={e => setEditForm(f => ({ ...f, latest_end: e.target.value === '23:59' ? '00:00' : e.target.value }))}
                      />
                    </label>
                  </div>
                  <RecurrenceFields value={editForm} onChange={setEditForm} />
                  <div className="form-actions">
                    <button type="button" className="btn-save" onClick={() => handleEditSave(t.id)}>Save</button>
                    <button type="button" className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="bank-item-title">{t.title}</span>
                  <span className="bank-item-meta">
                    {t.default_duration_min} min · {t.default_constraints.priority ?? 'Medium'}{recurrenceLabel(t)}
                  </span>
                  <div className="bank-item-controls">
                    <button className="btn-add" onClick={() => addToToday(t)} title="Add to today's schedule">
                      + Today
                    </button>
                    <button className="btn-icon" onClick={() => startEdit(t)} title="Edit template">✎</button>
                    <button className="btn-icon btn-icon--danger" onClick={() => deleteTemplate(userId, t.id)} title="Delete template">✕</button>
                  </div>
                  {warnId === t.id && (
                    <span className="bank-item-warn">
                      Task is longer than the working day (17 h max) — shorten it first.
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

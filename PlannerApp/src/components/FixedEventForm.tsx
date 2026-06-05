import { useState } from 'react'
import { saveEvent } from '../store/events'
import { saveEventTemplate } from '../store/eventTemplates'
import { buildRecurrenceString } from '../engine/recurrence'
import type { FixedEvent, EventTemplate } from '../types'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type RecurrenceType = 'never' | 'daily' | 'weekly' | 'biweekly' | 'monthly_date' | 'monthly_weekday'

interface Props {
  userId: string
  defaultDay: string
  onClose: () => void
  onSnapshot: () => void
}

export function FixedEventForm({ userId, defaultDay, onClose, onSnapshot }: Props) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(defaultDay)
  const [allDay, setAllDay] = useState(false)
  const [tentative, setTentative] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('never')
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [monthlyDate, setMonthlyDate] = useState(1)
  const [monthlyNth, setMonthlyNth] = useState(1)

  function toggleDay(d: number) {
    setRecurrenceDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const recurrence = buildRecurrenceString(
      recurrenceType,
      recurrenceDays,
      recurrenceType === 'biweekly' ? day : undefined,
      recurrenceType === 'monthly_date' ? monthlyDate : undefined,
      recurrenceType === 'monthly_weekday' ? monthlyNth : undefined,
    )

    if (recurrence) {
      const template: EventTemplate = {
        id: crypto.randomUUID(),
        title: title.trim(),
        start_time: allDay ? '' : startTime,
        end_time: allDay ? '' : endTime,
        recurrence,
        start_date: day,   // also serves as biweekly anchor via the rule JSON
        ...(allDay ? { all_day: true } : {}),
        ...(tentative && !allDay ? { tentative: true } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }
      await saveEventTemplate(userId, template)
    } else {
      const event: FixedEvent = {
        id: crypto.randomUUID(),
        title: title.trim(),
        start_datetime: allDay ? '' : startTime,
        end_datetime: allDay ? '' : endTime,
        day,
        ...(allDay ? { all_day: true } : {}),
        ...(tentative && !allDay ? { tentative: true } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }
      onSnapshot()
      await saveEvent(userId, event)
    }
    onClose()
  }

  return (
    <form className="inline-form event-form" onSubmit={handleSave}>
      <div className="event-form-header">
        <span className="event-form-title">Add Fixed Event</span>
        <button type="button" className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <input
        className="form-input"
        placeholder="Event title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        required
      />
      <label className="form-label form-label--inline">
        <input
          type="checkbox"
          checked={allDay}
          onChange={e => { setAllDay(e.target.checked); if (e.target.checked) setTentative(false) }}
        />
        All day
      </label>
      {!allDay && (
        <label className="form-label form-label--inline">
          <input
            type="checkbox"
            checked={tentative}
            onChange={e => setTentative(e.target.checked)}
          />
          Tentative (moves to next open slot if blocked)
        </label>
      )}
      {!allDay && (
        <div className="form-row">
          <label className="form-label">
            Start
            <input
              className="form-input"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="form-label">
            End
            <input
              className="form-input"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
            />
          </label>
        </div>
      )}
      <label className="form-label">
        Repeats
        <select
          className="form-input"
          value={recurrenceType}
          onChange={e => { setRecurrenceType(e.target.value as RecurrenceType); setRecurrenceDays([]) }}
        >
          <option value="never">Never (one-time)</option>
          <option value="daily">Every day</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every other week</option>
          <option value="monthly_date">Monthly (same date)</option>
          <option value="monthly_weekday">Monthly (nth weekday)</option>
        </select>
      </label>
      {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
        <div className="recurrence-days">
          {DAY_LABELS.map((label, i) => {
            const day = (i + 1) % 7
            return (
              <button
                key={day}
                type="button"
                className={`btn-day-toggle ${recurrenceDays.includes(day) ? 'active' : ''}`}
                onClick={() => toggleDay(day)}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
      {recurrenceType === 'monthly_date' && (
        <label className="form-label">
          Day of month
          <input
            className="form-input"
            type="number"
            min={1}
            max={31}
            value={monthlyDate}
            onChange={e => setMonthlyDate(parseInt(e.target.value, 10) || 1)}
          />
        </label>
      )}
      {recurrenceType === 'monthly_weekday' && (
        <>
          <label className="form-label">
            Which occurrence
            <select
              className="form-input"
              value={monthlyNth}
              onChange={e => setMonthlyNth(parseInt(e.target.value, 10))}
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
                  className={`btn-day-toggle ${recurrenceDays.includes(day) ? 'active' : ''}`}
                  onClick={() => setRecurrenceDays([day])}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </>
      )}
      {(recurrenceType === 'never' || recurrenceType === 'biweekly') && (
        <label className="form-label">
          {recurrenceType === 'biweekly' ? 'First occurrence (sets the alternating week)' : 'Date'}
          <input
            className="form-input"
            type="date"
            value={day}
            onChange={e => setDay(e.target.value)}
            required
          />
        </label>
      )}
      <input
        className="form-input"
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="form-actions">
        <button type="submit" className="btn-save">Save Event</button>
        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

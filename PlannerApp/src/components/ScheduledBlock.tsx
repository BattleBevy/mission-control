import { useState } from 'react'
import type { ScheduledBlock as ScheduledBlockType, TaskInstance, FixedEvent, Priority } from '../types'
import { toMinutes } from '../engine/time'

const DAY_START_MIN = 420 // toMinutes('07:00')

export interface TaskEditFields {
  title: string
  duration_min: number
  priority: Priority
  earliest_start: string
  latest_end: string
}

export interface EventEditFields {
  title: string
  start_time: string
  end_time: string
  notes: string
}

interface Props {
  block: ScheduledBlockType
  task?: TaskInstance
  event?: FixedEvent
  selected: boolean
  onSelect: () => void
  onDeselect: () => void
  onComplete: () => void
  onSkip: () => void
  onPause: () => void
  // Non-recurring flexible task
  onRemove?: () => void
  // Recurring flexible task
  onRemoveToday?: () => void
  onRemoveAll?: () => void
  // Edit flexible task — onEditForward only for recurring tasks
  onEditOccurrence?: (fields: TaskEditFields) => void
  onEditForward?: (fields: TaskEditFields) => void
  // Edit fixed event — onEditEventForward only for recurring events
  onEditEventOccurrence?: (fields: EventEditFields) => void
  onEditEventForward?: (fields: EventEditFields) => void
  // Carry-forward (flexible, not yet completed)
  onMoveToTomorrow?: () => void
  // Non-recurring fixed event
  onDeleteEvent?: () => void
  // Recurring fixed event
  onDeleteEventToday?: () => void
  onDeleteEventAll?: () => void
  onReschedule?: (newDay: string) => void
  // Drag-and-drop
  isDragging?: boolean
  onDragHandlePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  onDragHandlePointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void
  onDragHandlePointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void
  onDragHandlePointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function ScheduledBlock({
  block, task, event, selected, onSelect, onDeselect,
  onComplete, onSkip, onPause,
  onRemove, onRemoveToday, onRemoveAll,
  onEditOccurrence, onEditForward,
  onEditEventOccurrence, onEditEventForward,
  onMoveToTomorrow,
  onDeleteEvent, onDeleteEventToday, onDeleteEventAll,
  onReschedule,
  isDragging = false,
  onDragHandlePointerDown,
  onDragHandlePointerMove,
  onDragHandlePointerUp,
  onDragHandlePointerCancel,
}: Props) {
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [editMode, setEditMode] = useState(false)
  // Shared edit state — used for both task and event forms
  const [editTitle, setEditTitle] = useState('')
  const [editDuration, setEditDuration] = useState(30)
  const [editPriority, setEditPriority] = useState<Priority>('Medium')
  const [editStart, setEditStart] = useState('')  // earliest_start for tasks, start_time for events
  const [editEnd, setEditEnd] = useState('')      // latest_end for tasks, end_time for events
  const [editNotes, setEditNotes] = useState('')  // events only

  const top = toMinutes(block.start) - DAY_START_MIN
  const height = toMinutes(block.end) - toMinutes(block.start)

  const classes = [
    'scheduled-block',
    block.type,
    task ? `priority-${task.priority.toLowerCase()}` : '',
    block.status === 'completed' ? 'completed' : '',
    block.status === 'skipped' ? 'completed' : '',
    block.status === 'in_progress' ? 'in-progress' : '',
    selected ? 'selected' : '',
    (block.tentative || event?.tentative) ? 'tentative' : '',
    isDragging ? 'dragging' : '',
  ].filter(Boolean).join(' ')

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (block.status === 'completed' || block.status === 'skipped') return
    if (selected) {
      setRescheduleMode(false)
      setRescheduleDate('')
      setEditMode(false)
      onDeselect()
    } else {
      onSelect()
    }
  }

  function openEditMode() {
    if (block.type === 'flexible' && task) {
      setEditTitle(task.title)
      setEditDuration(task.duration_min)
      setEditPriority(task.priority)
      setEditStart(task.earliest_start)
      setEditEnd(task.latest_end)
      setEditNotes('')
    } else if (block.type === 'fixed' && event) {
      setEditTitle(event.title)
      setEditStart(event.start_datetime)
      setEditEnd(event.end_datetime)
      setEditNotes(event.notes ?? '')
    }
    setEditMode(v => !v)
    setRescheduleMode(false)
    setRescheduleDate('')
  }

  function handleTaskSave(forward: boolean) {
    const fields: TaskEditFields = {
      title: editTitle.trim() || block.title,
      duration_min: Math.max(5, editDuration),
      priority: editPriority,
      earliest_start: editStart,
      latest_end: editEnd,
    }
    if (forward) {
      onEditForward?.(fields)
    } else {
      onEditOccurrence?.(fields)
    }
    setEditMode(false)
  }

  function handleEventSave(forward: boolean) {
    const fields: EventEditFields = {
      title: editTitle.trim() || block.title,
      start_time: editStart,
      end_time: editEnd,
      notes: editNotes,
    }
    if (forward) {
      onEditEventForward?.(fields)
    } else {
      onEditEventOccurrence?.(fields)
    }
    setEditMode(false)
  }

  function handleRescheduleConfirm(e: React.MouseEvent) {
    e.stopPropagation()
    if (!rescheduleDate || !onReschedule) return
    onReschedule(rescheduleDate)
    setRescheduleMode(false)
    setRescheduleDate('')
  }

  const isActive = block.status !== 'completed' && block.status !== 'skipped'

  return (
    <div className={classes} style={{ top, ...(selected ? {} : { height }) }} onClick={handleClick}>
      <div className="block-header">
        <span className="block-title">{block.title}</span>
        {height >= 24 && <span className="block-time">{block.start}–{block.end}</span>}
        {onDragHandlePointerDown && (
          <div
            className="drag-handle"
            onClick={e => e.stopPropagation()}
            onPointerDown={onDragHandlePointerDown}
            onPointerMove={onDragHandlePointerMove}
            onPointerUp={onDragHandlePointerUp}
            onPointerCancel={onDragHandlePointerCancel}
          >⠿</div>
        )}
      </div>

      {selected && isActive && (
        <div className="block-actions" onClick={e => e.stopPropagation()}>
          {block.type === 'flexible' && (
            <>
              <button className="btn-action btn-complete" onClick={onComplete}>✓ Done</button>
              <button className="btn-action btn-pause" onClick={() => onPause()}>⏸ Pause</button>
              <button className="btn-action btn-skip" onClick={onSkip}>Skip</button>
              {onMoveToTomorrow && <button className="btn-action btn-move-tomorrow" onClick={onMoveToTomorrow}>→ Tomorrow</button>}
              {onEditOccurrence && (
                <button
                  className={`btn-action btn-edit${editMode ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); openEditMode() }}
                >
                  Edit
                </button>
              )}
              {onRemove && <button className="btn-action btn-remove-block" onClick={onRemove}>Remove</button>}
              {onRemoveToday && <button className="btn-action btn-remove-block" onClick={onRemoveToday}>Remove today</button>}
              {onRemoveAll && <button className="btn-action btn-remove-block" onClick={onRemoveAll}>Remove all</button>}
            </>
          )}
          {block.type === 'fixed' && onDeleteEvent && (
            <>
              {onEditEventOccurrence && (
                <button
                  className={`btn-action btn-edit${editMode ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); openEditMode() }}
                >
                  Edit
                </button>
              )}
              <button className="btn-action btn-remove-block" onClick={onDeleteEvent}>Delete event</button>
            </>
          )}
          {block.type === 'fixed' && (onDeleteEventToday || onReschedule) && (
            <>
              {onEditEventOccurrence && (
                <button
                  className={`btn-action btn-edit${editMode ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); openEditMode() }}
                >
                  Edit
                </button>
              )}
              {onReschedule && (
                <button
                  className={`btn-action btn-reschedule${rescheduleMode ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); setRescheduleMode(v => !v); setRescheduleDate(''); setEditMode(false) }}
                >
                  Reschedule
                </button>
              )}
              {onDeleteEventToday && <button className="btn-action btn-remove-block" onClick={onDeleteEventToday}>Delete today</button>}
              {onDeleteEventAll && <button className="btn-action btn-remove-block" onClick={onDeleteEventAll}>Delete all</button>}
            </>
          )}
          <button className="btn-action btn-deselect" onClick={onDeselect}>✕</button>
        </div>
      )}

      {/* ── Task edit form ─────────────────────────────────────────────────────── */}
      {selected && isActive && editMode && block.type === 'flexible' && (
        <div className="block-edit-form" onClick={e => e.stopPropagation()}>
          <div className="edit-row">
            <label className="edit-label">Title</label>
            <input
              className="form-input edit-input-title"
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="edit-row edit-row-split">
            <div className="edit-field">
              <label className="edit-label">Duration (min)</label>
              <input
                className="form-input"
                type="number"
                value={editDuration}
                min={5}
                max={480}
                step={5}
                onChange={e => setEditDuration(Number(e.target.value))}
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">Priority</label>
              <select
                className="form-input"
                value={editPriority}
                onChange={e => setEditPriority(e.target.value as Priority)}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div className="edit-row edit-row-split">
            <div className="edit-field">
              <label className="edit-label">Earliest start</label>
              <input
                className="form-input"
                type="time"
                value={editStart}
                onChange={e => setEditStart(e.target.value)}
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">Latest end</label>
              <input
                className="form-input"
                type="time"
                value={editEnd}
                onChange={e => setEditEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="edit-row edit-save-row">
            {onEditForward ? (
              <>
                <button className="btn-action btn-complete" onClick={() => handleTaskSave(false)}>Just today</button>
                <button className="btn-action btn-complete" onClick={() => handleTaskSave(true)}>This & future</button>
              </>
            ) : (
              <button className="btn-action btn-complete" onClick={() => handleTaskSave(false)}>Save</button>
            )}
            <button className="btn-action btn-deselect" onClick={e => { e.stopPropagation(); setEditMode(false) }}>✕</button>
          </div>
        </div>
      )}

      {/* ── Event edit form ────────────────────────────────────────────────────── */}
      {selected && isActive && editMode && block.type === 'fixed' && (
        <div className="block-edit-form" onClick={e => e.stopPropagation()}>
          <div className="edit-row">
            <label className="edit-label">Title</label>
            <input
              className="form-input edit-input-title"
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              autoFocus
            />
          </div>
          {!event?.all_day && (
            <div className="edit-row edit-row-split">
              <div className="edit-field">
                <label className="edit-label">Start time</label>
                <input
                  className="form-input"
                  type="time"
                  value={editStart}
                  onChange={e => setEditStart(e.target.value)}
                />
              </div>
              <div className="edit-field">
                <label className="edit-label">End time</label>
                <input
                  className="form-input"
                  type="time"
                  value={editEnd}
                  onChange={e => setEditEnd(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="edit-row">
            <label className="edit-label">Notes</label>
            <input
              className="form-input"
              type="text"
              value={editNotes}
              placeholder="Optional"
              onChange={e => setEditNotes(e.target.value)}
            />
          </div>
          <div className="edit-row edit-save-row">
            {onEditEventForward ? (
              <>
                <button className="btn-action btn-complete" onClick={() => handleEventSave(false)}>Just today</button>
                <button className="btn-action btn-complete" onClick={() => handleEventSave(true)}>This & future</button>
              </>
            ) : (
              <button className="btn-action btn-complete" onClick={() => handleEventSave(false)}>Save</button>
            )}
            <button className="btn-action btn-deselect" onClick={e => { e.stopPropagation(); setEditMode(false) }}>✕</button>
          </div>
        </div>
      )}

      {selected && isActive && rescheduleMode && (
        <div className="block-reschedule-form" onClick={e => e.stopPropagation()}>
          <span className="reschedule-label">Move this occurrence to:</span>
          <input
            className="form-input reschedule-input"
            type="date"
            value={rescheduleDate}
            onChange={e => setRescheduleDate(e.target.value)}
            autoFocus
          />
          <button
            className="btn-action btn-complete"
            onClick={handleRescheduleConfirm}
            disabled={!rescheduleDate}
          >
            Move
          </button>
          <button
            className="btn-action btn-deselect"
            onClick={e => { e.stopPropagation(); setRescheduleMode(false); setRescheduleDate('') }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

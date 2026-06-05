import { useState, useRef } from 'react'
import type { DayPlan, SchedulerOutput, TaskTemplate, EventTemplate } from '../types'
import { updateTask, saveTask, deleteTask, moveTask } from '../store/tasks'
import { saveTemplate, updateTemplate, deleteTemplate } from '../store/templates'
import { saveEvent, deleteEvent } from '../store/events'
import { saveEventTemplate, updateEventTemplate, deleteEventTemplate } from '../store/eventTemplates'
import { suppressEventOccurrence, suppressTaskOccurrence } from '../store/suppressions'
import { createInstance } from '../engine/recurrence'
import { toMinutes, fromMinutes } from '../engine/time'
import type { TaskInstance } from '../types'
import type { TaskEditFields, EventEditFields } from './ScheduledBlock'
import type { SuppressionRef } from '../hooks/useDayPlan'
import { CurrentTimeLine } from './CurrentTimeLine'
import { ScheduledBlock } from './ScheduledBlock'
import { GapBlock } from './GapBlock'
import { todayString } from '../hooks/useDayPlan'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7)
const HALF_HOURS = Array.from({ length: 17 }, (_, i) => i * 60 + 30)
const DAY_START_MIN = 420 // 07:00

const WORK_BAND_TOP = 180
const WORK_BAND_HEIGHT = 480

function isWeekday(day: string): boolean {
  const d = new Date(day + 'T00:00:00').getDay()
  return d >= 1 && d <= 5
}

function offsetDay(from: string, delta: number): string {
  const date = new Date(from + 'T00:00:00')
  date.setDate(date.getDate() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface Props {
  plan: DayPlan
  scheduled: SchedulerOutput
  userId: string
  onSnapshot: (suppression?: SuppressionRef) => void
  templates: TaskTemplate[]
  eventTemplates: EventTemplate[]
}

export function Timeline({ plan, scheduled, userId, onSnapshot, templates, eventTemplates }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAllDayId, setSelectedAllDayId] = useState<string | null>(null)

  // ── Drag-and-drop state ────────────────────────────────────────────────────
  const gridRef = useRef<HTMLDivElement>(null)
  // Stable data for event handlers — avoids stale closures
  const dragDataRef = useRef<{
    taskId: string
    blockType: 'flexible' | 'fixed'
    duration: number
    blockOriginalTop: number
    pointerStartY: number
    started: boolean
  } | null>(null)
  // Ref for reading in pointerUp (always current, no closure staleness)
  const ghostTopRef = useRef<number | null>(null)
  // State for rendering the ghost block
  const [ghostTopState, setGhostTopState] = useState<number | null>(null)
  // Which block ID is currently being dragged (for .dragging class)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function snap15(minutes: number): number {
    return Math.round(minutes / 15) * 15
  }

  function setGhostTop(top: number | null) {
    ghostTopRef.current = top
    setGhostTopState(top)
  }

  function handleDragHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragDataRef.current
    if (!d) return
    e.preventDefault()
    const gridRect = gridRef.current?.getBoundingClientRect()
    if (!gridRect) return
    const delta = (e.clientY - gridRect.top) - d.pointerStartY
    if (!d.started) {
      if (Math.abs(delta) < 5) return
      d.started = true
    }
    const rawMin = d.blockOriginalTop + delta + DAY_START_MIN
    const snapped = snap15(rawMin)
    const clamped = Math.max(DAY_START_MIN, Math.min(snapped, 1440 - d.duration))
    setGhostTop(clamped - DAY_START_MIN)
  }

  async function handleDragHandlePointerUp(_e: React.PointerEvent<HTMLDivElement>) {
    const d = dragDataRef.current
    const currentGhostTop = ghostTopRef.current
    dragDataRef.current = null
    setDraggingId(null)
    setGhostTop(null)
    if (!d?.started || currentGhostTop === null) return

    const newStartMin = currentGhostTop + DAY_START_MIN
    const newStart = fromMinutes(newStartMin)
    const newEnd = fromMinutes(newStartMin + d.duration)

    if (d.blockType === 'fixed') {
      const event = plan.fixed_events.find(e => e.id === d.taskId)
      if (!event) return
      if (event.template_id) {
        // Recurring: suppress today's occurrence, save a standalone with new times
        const suppressionId = `${event.template_id}-${plan.day}`
        onSnapshot({ id: suppressionId, type: 'event' })
        await suppressEventOccurrence(userId, event.template_id, plan.day)
        await saveEvent(userId, {
          id: crypto.randomUUID(),
          title: event.title,
          start_datetime: newStart,
          end_datetime: newEnd,
          day: plan.day,
          ...(event.notes ? { notes: event.notes } : {}),
          ...(event.tentative ? { tentative: true } : {}),
        })
      } else {
        // One-time: overwrite the existing doc in place
        onSnapshot()
        await saveEvent(userId, {
          id: event.id,
          title: event.title,
          start_datetime: newStart,
          end_datetime: newEnd,
          day: event.day,
          ...(event.notes ? { notes: event.notes } : {}),
          ...(event.tentative ? { tentative: true } : {}),
        })
      }
    } else {
      onSnapshot()
      await updateTask(userId, d.taskId, { earliest_start: newStart, latest_end: newEnd })
    }
  }

  function handleDragHandlePointerCancel(_e: React.PointerEvent<HTMLDivElement>) {
    dragDataRef.current = null
    setDraggingId(null)
    setGhostTop(null)
  }
  // ── End drag-and-drop ──────────────────────────────────────────────────────

  const allDayEvents = plan.fixed_events.filter(e => e.all_day)
  const taskMap = new Map(plan.flexible_tasks.map(t => [t.id, t]))

  async function handleComplete(taskId: string) {
    onSnapshot()
    const block = scheduled.scheduled.find(b => b.task_id === taskId)
    await updateTask(userId, taskId, {
      status: 'completed',
      scheduled_start: block?.start,
      scheduled_end: block?.end,
    })
    setSelectedId(null)
  }

  async function handleSkip(taskId: string) {
    onSnapshot()
    const block = scheduled.scheduled.find(b => b.task_id === taskId)
    await updateTask(userId, taskId, {
      status: 'skipped',
      scheduled_start: block?.start,
      scheduled_end: block?.end,
    })
    setSelectedId(null)
  }

  async function handlePause(taskId: string) {
    onSnapshot()
    const block = scheduled.scheduled.find(b => b.task_id === taskId)
    const task = taskMap.get(taskId)
    if (!block || !task) return

    const now = new Date()
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const elapsed = toMinutes(nowStr) - toMinutes(block.start)
    const remaining = Math.max(5, task.duration_min - elapsed)

    await updateTask(userId, taskId, {
      status: 'skipped',
      scheduled_start: block.start,
      scheduled_end: nowStr,
    })

    const resumed: TaskInstance = {
      id: crypto.randomUUID(),
      template_id: task.template_id,
      title: task.title,
      duration_min: remaining,
      earliest_start: nowStr,
      latest_end: task.latest_end,
      priority: task.priority,
      tags: task.tags,
      splittable: false,
      status: 'not_scheduled',
      day: task.day,
    }
    await saveTask(userId, resumed)
    setSelectedId(null)
  }

  async function handleMoveToTomorrow(taskId: string) {
    const task = taskMap.get(taskId)
    if (!task) return
    onSnapshot()
    const tomorrow = new Date(task.day + 'T00:00:00')
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    await moveTask(userId, task, tomorrowStr)
    setSelectedId(null)
  }

  async function handleRemove(taskId: string) {
    onSnapshot()
    await deleteTask(userId, taskId)
    setSelectedId(null)
  }

  async function handleRemoveToday(taskId: string) {
    const task = taskMap.get(taskId)
    if (!task?.template_id) return
    const suppressionId = `${task.template_id}-${task.day}`
    onSnapshot({ id: suppressionId, type: 'task' })
    await suppressTaskOccurrence(userId, task.template_id, task.day)
    await deleteTask(userId, taskId)
    setSelectedId(null)
  }

  async function handleRemoveAll(taskId: string) {
    const task = taskMap.get(taskId)
    if (!task?.template_id) return
    onSnapshot()
    await deleteTemplate(userId, task.template_id)
    await deleteTask(userId, taskId)
    setSelectedId(null)
  }

  // Edit just today's task instance
  async function handleEditOccurrence(taskId: string, fields: TaskEditFields) {
    onSnapshot()
    await updateTask(userId, taskId, {
      title: fields.title,
      duration_min: fields.duration_min,
      priority: fields.priority,
      earliest_start: fields.earliest_start,
      latest_end: fields.latest_end,
    })
    setSelectedId(null)
  }

  // Fork the task template series from today with new settings
  async function handleEditForward(taskId: string, fields: TaskEditFields) {
    const task = taskMap.get(taskId)
    if (!task?.template_id) return
    const oldTemplate = templates.find(t => t.id === task.template_id)
    if (!oldTemplate) return
    onSnapshot()

    const newTemplateId = crypto.randomUUID()
    const newTemplate: TaskTemplate = {
      id: newTemplateId,
      title: fields.title,
      default_duration_min: fields.duration_min,
      default_tags: [...oldTemplate.default_tags],
      default_constraints: {
        earliest_start: fields.earliest_start,
        latest_end: fields.latest_end,
        priority: fields.priority,
      },
      ...(oldTemplate.default_recurrence ? { default_recurrence: oldTemplate.default_recurrence } : {}),
      start_date: plan.day,
    }
    await saveTemplate(userId, newTemplate)
    await updateTemplate(userId, oldTemplate.id, { end_date: offsetDay(plan.day, -1) })
    await suppressTaskOccurrence(userId, oldTemplate.id, plan.day)
    await deleteTask(userId, taskId)
    await saveTask(userId, createInstance(newTemplate, plan.day))
    setSelectedId(null)
  }

  // Edit just today's event occurrence
  async function handleEditEventOccurrence(eventId: string, fields: EventEditFields) {
    const event = plan.fixed_events.find(e => e.id === eventId)
    if (!event) return
    onSnapshot()

    if (event.template_id) {
      // Recurring: suppress original occurrence, save standalone with new values
      const suppressionId = `${event.template_id}-${plan.day}`
      onSnapshot({ id: suppressionId, type: 'event' })
      await suppressEventOccurrence(userId, event.template_id, plan.day)
      await saveEvent(userId, {
        id: crypto.randomUUID(),
        title: fields.title,
        start_datetime: fields.start_time,
        end_datetime: fields.end_time,
        day: plan.day,
        ...(fields.notes ? { notes: fields.notes } : {}),
        ...(event.all_day ? { all_day: true } : {}),
        ...(event.tentative ? { tentative: true } : {}),
      })
    } else {
      // One-time: overwrite the existing doc (no suppression involved)
      onSnapshot()
      await saveEvent(userId, {
        id: event.id,
        title: fields.title,
        start_datetime: fields.start_time,
        end_datetime: fields.end_time,
        day: event.day,
        ...(fields.notes ? { notes: fields.notes } : {}),
        ...(event.all_day ? { all_day: true } : {}),
        ...(event.tentative ? { tentative: true } : {}),
      })
    }
    setSelectedId(null)
  }

  // Fork the event template series from today with new settings
  async function handleEditEventForward(eventId: string, fields: EventEditFields) {
    const event = plan.fixed_events.find(e => e.id === eventId)
    if (!event?.template_id) return
    const oldTemplate = eventTemplates.find(t => t.id === event.template_id)
    if (!oldTemplate) return
    onSnapshot()

    const newTemplateId = crypto.randomUUID()
    const newTemplate: EventTemplate = {
      id: newTemplateId,
      title: fields.title,
      start_time: fields.start_time,
      end_time: fields.end_time,
      recurrence: oldTemplate.recurrence,
      start_date: plan.day,
      ...(fields.notes ? { notes: fields.notes } : {}),
      ...(oldTemplate.all_day ? { all_day: true } : {}),
      ...(oldTemplate.tentative ? { tentative: true } : {}),
    }
    await saveEventTemplate(userId, newTemplate)
    await updateEventTemplate(userId, oldTemplate.id, { end_date: offsetDay(plan.day, -1) })
    await suppressEventOccurrence(userId, oldTemplate.id, plan.day)
    // No Firestore doc to delete — recurring event instances are materialized in memory.
    // The suppression above removes today's occurrence; the new template generates one.
    setSelectedId(null)
  }

  async function handleDeleteEvent(eventId: string) {
    onSnapshot()
    await deleteEvent(userId, eventId)
    setSelectedId(null)
  }

  async function handleDeleteEventToday(eventId: string) {
    const event = plan.fixed_events.find(e => e.id === eventId)
    if (!event?.template_id) return
    const suppressionId = `${event.template_id}-${plan.day}`
    onSnapshot({ id: suppressionId, type: 'event' })
    await suppressEventOccurrence(userId, event.template_id, plan.day)
    setSelectedId(null)
  }

  async function handleDeleteEventAll(eventId: string) {
    const event = plan.fixed_events.find(e => e.id === eventId)
    if (!event?.template_id) return
    await deleteEventTemplate(userId, event.template_id)
    setSelectedId(null)
  }

  async function handleReschedule(eventId: string, newDay: string) {
    const event = plan.fixed_events.find(e => e.id === eventId)
    if (!event?.template_id) return
    await suppressEventOccurrence(userId, event.template_id, plan.day)
    await saveEvent(userId, {
      id: crypto.randomUUID(),
      title: event.title,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      day: newDay,
      ...(event.notes ? { notes: event.notes } : {}),
      ...(event.all_day ? { all_day: true } : {}),
      ...(event.tentative ? { tentative: true } : {}),
    })
    setSelectedId(null)
  }

  return (
    <div className="timeline" onClick={() => { setSelectedId(null); setSelectedAllDayId(null) }}>
      {allDayEvents.length > 0 && (
        <div className="allday-strip">
          {allDayEvents.map(event => {
            const isSelected = selectedAllDayId === event.id
            const isRecurring = !!event.template_id
            return (
              <div
                key={event.id}
                className={`allday-pill${isSelected ? ' allday-pill--selected' : ''}`}
                onClick={e => { e.stopPropagation(); setSelectedAllDayId(isSelected ? null : event.id) }}
              >
                <span className="allday-pill-title">{event.title}</span>
                {isSelected && (
                  <span className="allday-pill-actions" onClick={e => e.stopPropagation()}>
                    {isRecurring ? (
                      <>
                        <button className="btn-allday-action" onClick={() => handleDeleteEventToday(event.id)}>Today</button>
                        <button className="btn-allday-action btn-allday-action--danger" onClick={() => handleDeleteEventAll(event.id)}>All</button>
                      </>
                    ) : (
                      <button className="btn-allday-action btn-allday-action--danger" onClick={() => handleDeleteEvent(event.id)}>✕</button>
                    )}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div className="timeline-grid" ref={gridRef}>
        {HOURS.map(h => (
          <div key={h} className="timeline-hour" style={{ top: (h - 7) * 60 }}>
            <span className="timeline-hour-label">{String(h).padStart(2, '0')}:00</span>
            <div className="timeline-hour-line" />
          </div>
        ))}
        <div className="timeline-hour" style={{ top: 1020 }}>
          <span className="timeline-hour-label">00:00</span>
          <div className="timeline-hour-line" />
        </div>

        {HALF_HOURS.map(offset => (
          <div key={offset} className="timeline-half-hour" style={{ top: offset }} />
        ))}

        {isWeekday(plan.day) && (
          <div className="work-hours-band" style={{ top: WORK_BAND_TOP, height: WORK_BAND_HEIGHT }} />
        )}

        {plan.day === todayString() && <CurrentTimeLine />}

        {ghostTopState !== null && dragDataRef.current && (
          <div
            className="drag-ghost"
            style={{ top: ghostTopState, height: dragDataRef.current.duration }}
          />
        )}

        {scheduled.gaps.map((gap, i) => (
          <GapBlock key={i} gap={gap} />
        ))}

        {plan.flexible_tasks
          .filter(t => (t.status === 'completed' || t.status === 'skipped') && t.scheduled_start && t.scheduled_end)
          .map(t => (
            <ScheduledBlock
              key={`ghost-${t.id}`}
              block={{ task_id: t.id, title: t.title, type: 'flexible', start: t.scheduled_start!, end: t.scheduled_end!, status: t.status }}
              task={t}
              selected={false}
              onSelect={() => {}}
              onDeselect={() => {}}
              onComplete={() => {}}
              onSkip={() => {}}
              onPause={() => {}}
            />
          ))
        }

        {scheduled.scheduled.map(block => {
          const task = taskMap.get(block.task_id)
          const event = block.type === 'fixed' ? plan.fixed_events.find(e => e.id === block.task_id) : undefined
          const isRecurringTask = block.type === 'flexible' && !!task?.template_id
          const isRecurringEvent = block.type === 'fixed' && !!event?.template_id
          const isDraggable =
            (block.type === 'flexible' && block.status === 'scheduled') ||
            (block.type === 'fixed' && !event?.all_day)
          const blockTop = toMinutes(block.start) - DAY_START_MIN
          const blockDuration = toMinutes(block.end) - toMinutes(block.start)
          return (
            <ScheduledBlock
              key={block.task_id}
              block={block}
              task={task}
              event={event}
              selected={selectedId === block.task_id}
              onSelect={() => setSelectedId(block.task_id)}
              onDeselect={() => setSelectedId(null)}
              onComplete={() => handleComplete(block.task_id)}
              onSkip={() => handleSkip(block.task_id)}
              onPause={() => handlePause(block.task_id)}
              onMoveToTomorrow={block.type === 'flexible' && block.status === 'scheduled' ? () => handleMoveToTomorrow(block.task_id) : undefined}
              onEditOccurrence={block.type === 'flexible' ? (fields) => handleEditOccurrence(block.task_id, fields) : undefined}
              onEditForward={isRecurringTask ? (fields) => handleEditForward(block.task_id, fields) : undefined}
              onRemove={block.type === 'flexible' && !isRecurringTask ? () => handleRemove(block.task_id) : undefined}
              onRemoveToday={isRecurringTask ? () => handleRemoveToday(block.task_id) : undefined}
              onRemoveAll={isRecurringTask ? () => handleRemoveAll(block.task_id) : undefined}
              onEditEventOccurrence={block.type === 'fixed' ? (fields) => handleEditEventOccurrence(block.task_id, fields) : undefined}
              onEditEventForward={isRecurringEvent ? (fields) => handleEditEventForward(block.task_id, fields) : undefined}
              onDeleteEvent={block.type === 'fixed' && !isRecurringEvent ? () => handleDeleteEvent(block.task_id) : undefined}
              onDeleteEventToday={isRecurringEvent ? () => handleDeleteEventToday(block.task_id) : undefined}
              onDeleteEventAll={isRecurringEvent ? () => handleDeleteEventAll(block.task_id) : undefined}
              onReschedule={isRecurringEvent ? (newDay) => handleReschedule(block.task_id, newDay) : undefined}
              isDragging={draggingId === block.task_id}
              onDragHandlePointerDown={isDraggable ? (e: React.PointerEvent<HTMLDivElement>) => {
                e.stopPropagation()
                e.preventDefault()
                const gridRect = gridRef.current?.getBoundingClientRect()
                if (!gridRect) return
                e.currentTarget.setPointerCapture(e.pointerId)
                dragDataRef.current = {
                  taskId: block.task_id,
                  blockType: block.type,
                  duration: blockDuration,
                  blockOriginalTop: blockTop,
                  pointerStartY: e.clientY - gridRect.top,
                  started: false,
                }
                setDraggingId(block.task_id)
              } : undefined}
              onDragHandlePointerMove={isDraggable ? handleDragHandlePointerMove : undefined}
              onDragHandlePointerUp={isDraggable ? handleDragHandlePointerUp : undefined}
              onDragHandlePointerCancel={isDraggable ? handleDragHandlePointerCancel : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

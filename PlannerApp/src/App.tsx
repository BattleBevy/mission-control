import { useState, useEffect, useRef } from 'react'
import type { User } from 'firebase/auth'
import { useAuth } from './hooks/useAuth'
import { useDayPlan, todayString } from './hooks/useDayPlan'
import { useTemplates } from './hooks/useTemplates'
import { useEventTemplates } from './hooks/useEventTemplates'
import { signIn, signInAnon, signOut } from './store/auth'
import { seedDemoIfEmpty } from './demo/seedDemo'
import { saveTask, moveTask } from './store/tasks'
import { parseRecurrence, shouldFireOnDay, createInstance } from './engine/recurrence'
import { toMinutes } from './engine/time'
import { Timeline } from './components/Timeline'
import { TaskBankPanel } from './components/TaskBankPanel'
import { AnytimePanel } from './components/AnytimePanel'
import { UnscheduledList } from './components/UnscheduledList'
import { ConflictDialog } from './components/ConflictDialog'
import { OverduePrompt } from './components/OverduePrompt'
import { FixedEventForm } from './components/FixedEventForm'
import { QuickAddTaskForm } from './components/QuickAddTaskForm'
import { WeekView } from './components/WeekView'
import { Tour } from './components/Tour'
import './App.css'

function nowString(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function offsetDay(from: string, delta: number): string {
  const date = new Date(from + 'T00:00:00')
  date.setDate(date.getDate() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDayLabel(day: string): string {
  const date = new Date(day + 'T00:00:00')
  const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return day === todayString() ? `Today · ${formatted}` : formatted
}

function getMondayOfWeek(day: string): string {
  const d = new Date(day + 'T00:00:00')
  const dow = d.getDay() // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Authenticated view ───────────────────────────────────────────────────────

function SchedulerView({ user }: { user: User }) {
  const [selectedDay, setSelectedDay] = useState(todayString)
  const [view, setView] = useState<'day' | 'week'>('day')
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(todayString()))
  const { plan, scheduled, conflicts, loading, snapshot, canUndo, undo, suppressedTaskTemplateIds } = useDayPlan(user.uid, selectedDay)
  const templates = useTemplates(user.uid)
  const eventTemplates = useEventTemplates(user.uid)
  const [conflictDismissed, setConflictDismissed] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const generatedDayRef = useRef<string | null>(null)
  const [now, setNow] = useState(nowString)
  const isToday = selectedDay === todayString()

  // Tick every minute so the overdue check re-runs even without a plan change.
  useEffect(() => {
    const interval = setInterval(() => setNow(nowString()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // First scheduled task whose end time has passed and hasn't been actioned yet.
  const overdueTask = isToday && plan
    ? (plan.flexible_tasks.find(t =>
        t.status === 'scheduled' &&
        !!t.scheduled_end &&
        toMinutes(t.scheduled_end) <= toMinutes(now)
      ) ?? null)
    : null

  function switchToDay(day: string) {
    setSelectedDay(day)
    setView('day')
  }

  function handlePrevWeek() {
    setWeekStart(d => offsetDay(d, -7))
  }

  function handleNextWeek() {
    setWeekStart(d => offsetDay(d, 7))
  }

  const showConflictDialog = !conflictDismissed && !!scheduled && scheduled.unscheduled.length > 0

  // Tasks eligible for carry-forward: unscheduled OR scheduled-but-untouched flexible blocks
  const scheduledUntouchedIds = new Set(
    (scheduled?.scheduled ?? [])
      .filter(b => b.type === 'flexible' && b.status === 'scheduled')
      .map(b => b.task_id)
  )
  const carryForwardTasks = (plan?.flexible_tasks ?? []).filter(
    t => scheduledUntouchedIds.has(t.id) || (scheduled?.unscheduled ?? []).some(u => u.id === t.id)
  )
  const swappableTasks = (plan?.flexible_tasks ?? []).filter(t => scheduledUntouchedIds.has(t.id))

  async function handleMoveAllToTomorrow() {
    if (carryForwardTasks.length === 0) return
    snapshot()
    const tomorrow = offsetDay(selectedDay, 1)
    await Promise.all(carryForwardTasks.map(t => moveTask(user.uid, t, tomorrow)))
    setConflictDismissed(false)
  }

  // Auto-generate recurring task instances for the selected day (once per day navigation)
  useEffect(() => {
    if (!plan || templates.length === 0) return
    if (generatedDayRef.current === selectedDay) return
    generatedDayRef.current = selectedDay

    const existingTemplateIds = new Set(
      plan.flexible_tasks.filter(t => t.template_id).map(t => t.template_id!)
    )
    for (const template of templates) {
      if (!template.default_recurrence) continue
      if (existingTemplateIds.has(template.id)) continue
      if (suppressedTaskTemplateIds.has(template.id)) continue
      if (template.start_date && selectedDay < template.start_date) continue
      if (template.end_date && selectedDay > template.end_date) continue
      const rule = parseRecurrence(template.default_recurrence)
      if (rule && shouldFireOnDay(rule, selectedDay)) {
        void saveTask(user.uid, createInstance(template, selectedDay))
      }
    }
  }, [plan, templates, selectedDay, user.uid, suppressedTaskTemplateIds])

  useEffect(() => {
    setConflictDismissed(false)
    setShowEventForm(false)
    setShowTaskForm(false)
  }, [selectedDay])

  return (
    <div id="app">
      {user.isAnonymous && (
        <div className="demo-banner">
          <span className="demo-banner-text">Demo mode · Exploring a sample schedule.</span>
          <button className="btn-tour" onClick={() => setShowTour(true)}>Take the tour →</button>
        </div>
      )}
      {showTour && <Tour onClose={() => setShowTour(false)} />}
      <header className="app-header">
        <h1 className="app-title">The Mossbound Hourglass</h1>
        {view === 'day' && (
          <div className="day-nav">
            <button className="btn-ghost btn-day-nav" onClick={() => setSelectedDay(d => offsetDay(d, -1))}>‹</button>
            <span className="app-date">{formatDayLabel(selectedDay)}</span>
            <button className="btn-ghost btn-day-nav" onClick={() => setSelectedDay(d => offsetDay(d, 1))}>›</button>
            {!isToday && (
              <button className="btn-ghost btn-today" onClick={() => setSelectedDay(todayString())}>Today</button>
            )}
          </div>
        )}
        <div className="app-header-right">
          <a href="../" className="btn-ghost btn-hub">← Hub</a>
          <div className="view-toggle">
            <button className={`btn-view${view === 'day' ? ' active' : ''}`} onClick={() => setView('day')}>Day</button>
            <button className={`btn-view${view === 'week' ? ' active' : ''}`} onClick={() => { setView('week'); setWeekStart(getMondayOfWeek(selectedDay)) }}>Week</button>
          </div>
          {view === 'day' && canUndo && (
            <button className="btn-ghost btn-undo" onClick={undo} title="Undo last action">↩ Undo</button>
          )}
          <span className="app-user">{user.email}</span>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {view === 'week' ? (
        <WeekView
          userId={user.uid}
          weekStart={weekStart}
          onSelectDay={switchToDay}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
        />
      ) : (
        <main className="app-layout">
          <TaskBankPanel userId={user.uid} />

          {overdueTask && (
            <OverduePrompt
              task={overdueTask}
              userId={user.uid}
              onSnapshot={snapshot}
            />
          )}

          {!overdueTask && showConflictDialog && (
            <ConflictDialog
              tasks={scheduled!.unscheduled}
              conflicts={conflicts}
              userId={user.uid}
              onDismiss={() => setConflictDismissed(true)}
              onSnapshot={snapshot}
              swappableTasks={swappableTasks}
            />
          )}

          <section className="timeline-section">
            <div className="timeline-toolbar">
              <button
                className="btn-add-event"
                onClick={() => { setShowTaskForm(v => !v); setShowEventForm(false) }}
                title="Add a one-off task to this day"
              >
                + Task
              </button>
              <button
                className="btn-add-event"
                onClick={() => { setShowEventForm(v => !v); setShowTaskForm(false) }}
                title="Add a fixed event to this day"
              >
                + Event
              </button>
              {carryForwardTasks.length > 0 && (
                <button
                  className="btn-carry-forward"
                  onClick={handleMoveAllToTomorrow}
                  title="Move all unfinished tasks to tomorrow"
                >
                  → Tomorrow ({carryForwardTasks.length})
                </button>
              )}
            </div>

            {showTaskForm && (
              <QuickAddTaskForm
                userId={user.uid}
                day={selectedDay}
                onClose={() => setShowTaskForm(false)}
              />
            )}

            {showEventForm && (
              <FixedEventForm
                userId={user.uid}
                defaultDay={selectedDay}
                onClose={() => setShowEventForm(false)}
                onSnapshot={snapshot}
              />
            )}

            {loading
              ? <p className="status-text">Loading schedule…</p>
              : plan && scheduled
                ? <>
                    <Timeline plan={plan} scheduled={scheduled} userId={user.uid} onSnapshot={snapshot} templates={templates} eventTemplates={eventTemplates} />
                    {plan.flexible_tasks.length === 0 && plan.fixed_events.length === 0 && (
                      <p className="empty-day-prompt">No tasks yet — use + Task above or add from the Task Bank →</p>
                    )}
                    <UnscheduledList tasks={scheduled.unscheduled} conflicts={conflicts} userId={user.uid} onSnapshot={snapshot} />
                  </>
                : <p className="status-text">No schedule for {isToday ? 'today' : 'this day'} yet.</p>
            }
          </section>

          <AnytimePanel
            userId={user.uid}
            tasks={plan?.anytime_tasks ?? []}
          />
        </main>
      )}
    </div>
  )
}

// ─── Root — auth gate ─────────────────────────────────────────────────────────

function App() {
  const user = useAuth()

  useEffect(() => {
    if (user?.isAnonymous) {
      seedDemoIfEmpty(user.uid, todayString()).catch(console.warn)
    }
  }, [user?.uid, user?.isAnonymous])

  if (user === undefined) {
    return (
      <div id="app" className="app-centered">
        <p className="status-text">Loading…</p>
      </div>
    )
  }

  if (user === null) {
    return (
      <div id="app" className="app-centered">
        <div className="login-card">
          <h1 className="app-title">The Mossbound Hourglass</h1>
          <p className="login-subtitle">Constraint-based scheduling that adapts in real time.</p>
          <div className="login-actions">
            <button className="btn-primary" onClick={signIn}>Sign in with Google</button>
            <span className="login-or">or</span>
            <button className="btn-ghost" onClick={signInAnon}>Try Demo →</button>
          </div>
        </div>
      </div>
    )
  }

  return <SchedulerView user={user} />
}

export default App

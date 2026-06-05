import { useWeekPlan } from '../hooks/useWeekPlan'
import { todayString } from '../hooks/useDayPlan'

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dayLabel(day: string): string {
  const d = new Date(day + 'T00:00:00')
  const dow = DOW_LABELS[(d.getDay() + 6) % 7] // Sun(0)→6, Mon(1)→0
  return `${dow} ${d.getMonth() + 1}/${d.getDate()}`
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekStart + 'T00:00:00')
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

interface Props {
  userId: string
  weekStart: string
  onSelectDay: (day: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
}

export function WeekView({ userId, weekStart, onSelectDay, onPrevWeek, onNextWeek }: Props) {
  const { days, loading } = useWeekPlan(userId, weekStart)
  const today = todayString()

  return (
    <div className="week-view">
      <div className="week-nav">
        <button className="btn-ghost btn-day-nav" onClick={onPrevWeek}>‹</button>
        <span className="week-label">{formatWeekRange(weekStart)}</span>
        <button className="btn-ghost btn-day-nav" onClick={onNextWeek}>›</button>
      </div>

      {loading ? (
        <p className="status-text" style={{ padding: 'var(--space-6)' }}>Loading week…</p>
      ) : (
        <div className="week-grid">
          {days.map(({ day, scheduled, allDayEvents }) => {
            const isToday = day === today
            return (
              <div key={day} className={`week-day${isToday ? ' week-day--today' : ''}`}>
                <button className="week-day-header" onClick={() => onSelectDay(day)}>
                  {dayLabel(day)}
                  {isToday && <span className="week-today-dot" />}
                </button>
                {allDayEvents.length > 0 && (
                  <div className="week-allday-pills">
                    {allDayEvents.map(e => (
                      <span key={e.id} className="week-allday-pill" title={e.title}>{e.title}</span>
                    ))}
                  </div>
                )}
                <ul className="week-day-blocks">
                  {scheduled.length === 0 ? (
                    <li className="week-empty">—</li>
                  ) : (
                    scheduled.map(block => (
                      <li
                        key={block.task_id}
                        className={`week-block week-block--${block.type}`}
                        onClick={() => onSelectDay(day)}
                        title={`${block.start}–${block.end} · ${block.title}`}
                      >
                        <span className="week-block-time">{block.start}</span>
                        <span className="week-block-title">{block.title}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

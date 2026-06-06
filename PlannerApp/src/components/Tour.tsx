import { useState, useEffect } from 'react'

interface Step {
  sel?: string
  title: string
  body: string
  place?: 'above' | 'below' | 'left' | 'right'
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Daily Scheduler',
    body: "This is a sample day — personal tasks in the morning and evening, work tasks during the day. Take a quick tour to see how it works, or close this and explore on your own.",
  },
  {
    sel: '.scheduled-block.fixed',
    title: 'Fixed events anchor the day',
    body: "Amber-bordered blocks are fixed events — locked to their times. Team Standup, Lunch, meetings. The scheduler builds everything else around them.",
    place: 'below',
  },
  {
    sel: '.scheduled-block.flexible.priority-high',
    title: 'Flexible tasks fill the gaps',
    body: "These blocks are flexible tasks. Set the duration and a time window — the app finds the best slot. High-priority tasks (amber) always schedule before medium or low ones.",
    place: 'below',
  },
  {
    sel: '.drag-handle',
    title: 'Drag to reschedule',
    body: "Those six dots are the drag handle. Grab one and slide the block to a new time. The rest of the schedule adjusts automatically around it.",
    place: 'below',
  },
  {
    sel: '.bank-item',
    title: 'Task Bank — your recurring tasks',
    body: "Tasks you do regularly live here. 'Review pull requests' every morning, 'Update runbook' on Fridays — add them to today with one click, or set a schedule and they auto-appear.",
    place: 'right',
  },
  {
    sel: '.anytime-item',
    title: 'Anytime tasks — no slot needed',
    body: "Some things just need to get done today, but timing doesn't matter. Park them here — no timeline slot needed. Check them off as you go.",
    place: 'left',
  },
  {
    title: "That's the tour!",
    body: "Try clicking a block to see its options — mark it done, edit it, or move it to tomorrow. The schedule recalculates live after every change.",
  },
]

const PAD = 10
const BUBBLE_W = 300

interface SR { top: number; left: number; width: number; height: number }

export function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [sr, setSr] = useState<SR | null>(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    const { sel } = STEPS[step]
    if (!sel) {
      setSr(null)
      return
    }
    const el = document.querySelector(sel)
    if (!el) {
      setSr(null)
      return
    }
    el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'nearest' })
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      setSr({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    })
  }, [step])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') isLast ? onClose() : setStep(s => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, isLast, onClose])

  const W = window.innerWidth
  const H = window.innerHeight
  const MARGIN = 16

  function bubblePos(): React.CSSProperties {
    if (!sr) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    const gap = 14
    const clampLeft = (l: number) => Math.max(MARGIN, Math.min(W - BUBBLE_W - MARGIN, l))
    switch (current.place) {
      case 'above':
        return { top: Math.max(MARGIN, sr.top - gap - 180), left: clampLeft(sr.left + sr.width / 2 - BUBBLE_W / 2) }
      case 'left':
        return { top: Math.max(MARGIN, sr.top), left: Math.max(MARGIN, sr.left - BUBBLE_W - gap) }
      case 'right':
        return { top: Math.max(MARGIN, sr.top), left: Math.min(W - BUBBLE_W - MARGIN, sr.left + sr.width + gap) }
      default: // below
        return { top: Math.min(H - 220, sr.top + sr.height + gap), left: clampLeft(sr.left + sr.width / 2 - BUBBLE_W / 2) }
    }
  }

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Feature tour">
      {sr ? (
        <>
          <div className="tour-shade" style={{ top: 0, left: 0, right: 0, height: sr.top }} />
          <div className="tour-shade" style={{ top: sr.top + sr.height, left: 0, right: 0, bottom: 0 }} />
          <div className="tour-shade" style={{ top: sr.top, left: 0, width: sr.left, height: sr.height }} />
          <div className="tour-shade" style={{ top: sr.top, left: sr.left + sr.width, right: 0, height: sr.height }} />
          <div className="tour-ring" style={{ top: sr.top, left: sr.left, width: sr.width, height: sr.height }} />
        </>
      ) : (
        <div className="tour-shade tour-shade--full" />
      )}

      <div className="tour-bubble" key={step} style={{ ...bubblePos() }}>
        <div className="tour-bubble-top">
          <span className="tour-counter">{step + 1} / {STEPS.length}</span>
          <button className="tour-close" onClick={onClose} title="Close tour">✕</button>
        </div>
        <div className="tour-bubble-title">{current.title}</div>
        <p className="tour-bubble-body">{current.body}</p>
        <div className="tour-bubble-actions">
          {step > 0 && (
            <button className="btn-ghost tour-btn" onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          <button className="btn-primary tour-btn" onClick={() => isLast ? onClose() : setStep(s => s + 1)}>
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

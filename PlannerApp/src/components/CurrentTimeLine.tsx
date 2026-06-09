import { useState, useEffect } from 'react'
import { toMinutes } from '../engine/time'

const DAY_START_MIN = toMinutes('07:00') // 420
const DAY_END_MIN = toMinutes('00:00')   // 1440

function nowString(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function CurrentTimeLine() {
  const [time, setTime] = useState(nowString)

  useEffect(() => {
    const tick = () => setTime(nowString())
    const id = setInterval(tick, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const minutes = toMinutes(time)
  if (minutes < DAY_START_MIN || minutes >= DAY_END_MIN) return null

  return <div className="current-time-line" style={{ top: minutes - DAY_START_MIN }} />
}

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
    const id = setInterval(() => setTime(nowString()), 60_000)
    return () => clearInterval(id)
  }, [])

  const minutes = toMinutes(time)
  if (minutes < DAY_START_MIN || minutes >= DAY_END_MIN) return null

  return <div className="current-time-line" style={{ top: minutes - DAY_START_MIN }} />
}

/** "HH:MM" → minutes since midnight. "00:00" → 1440 (end of working day). */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h === 0 && m === 0 ? 1440 : h * 60 + m
}

/** minutes since midnight → "HH:MM" */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

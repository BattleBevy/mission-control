import type { GapBlock as GapBlockType } from '../types'
import { toMinutes } from '../engine/time'

const DAY_START_MIN = 420 // toMinutes('07:00')

interface Props {
  gap: GapBlockType
}

export function GapBlock({ gap }: Props) {
  const top = toMinutes(gap.start) - DAY_START_MIN
  const height = gap.duration_min

  if (height < 5) return null

  return (
    <div
      className="gap-block"
      style={{ top, height }}
      title={`Free: ${gap.duration_min} min`}
    />
  )
}

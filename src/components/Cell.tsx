import { memo } from 'react'
import type { Cell as CellValue } from '../game/types'

export const Cell = memo(function Cell({
  color,
  ghost = false,
}: {
  color: CellValue
  ghost?: boolean
}) {
  return (
    <div
      className={ghost ? 'cell ghost' : 'cell'}
      style={color ? (ghost ? { borderColor: color } : { background: color }) : undefined}
    />
  )
})

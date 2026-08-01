import { memo } from 'react'
import type { Cell as CellValue } from '../game/types'

export const Cell = memo(function Cell({ color }: { color: CellValue }) {
  return <div className="cell" style={color ? { background: color } : undefined} />
})

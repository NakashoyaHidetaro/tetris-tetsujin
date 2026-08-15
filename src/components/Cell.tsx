import { memo } from 'react'
import { tetrominoTypeOfColor } from '../game/tetrominoes'
import type { Cell as CellValue } from '../game/types'

export const Cell = memo(function Cell({
  color,
  ghost = false,
}: {
  color: CellValue
  ghost?: boolean
}) {
  // 色は CSS 変数参照 (var(--mino-x)) なので、そのまま inline style に載せれば
  // テーマ / パレット切替に追従する (PRD #9)
  const type = tetrominoTypeOfColor(color)
  return (
    <div
      className={ghost ? 'cell ghost' : 'cell'}
      // 記号表示 (PRD #17) は CSS 側で data-mino から描く
      data-mino={type ?? undefined}
      style={color ? (ghost ? { borderColor: color } : { background: color }) : undefined}
    />
  )
})

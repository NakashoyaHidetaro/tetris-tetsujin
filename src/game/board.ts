import { COLS, ROWS } from './constants'
import type { Board, Cell, Piece, Shape } from './types'

export const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null))

export const collides = (board: Board, shape: Shape, x: number, y: number): boolean =>
  shape.some((row, dy) =>
    row.some((v, dx) => {
      if (!v) return false
      const px = x + dx
      const py = y + dy
      return px < 0 || px >= COLS || py >= ROWS || (py >= 0 && board[py][px] !== null)
    }),
  )

export const composeDisplay = (board: Board, piece: Piece): Board => {
  const display = board.map((row) => [...row])
  piece.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      const py = piece.y + dy
      const px = piece.x + dx
      if (v && py >= 0 && py < ROWS) display[py][px] = piece.color
    }),
  )
  return display
}

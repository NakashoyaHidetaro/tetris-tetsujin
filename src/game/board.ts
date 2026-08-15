import { COLS, ROWS } from './constants'
import type { Board, Cell, Piece, Shape } from './types'

/** 表示用セル: 色と「ゴーストかどうか」を持つ */
export interface DisplayCell {
  color: Cell
  ghost: boolean
}

export type DisplayBoard = DisplayCell[][]

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

/** ミノをそのまま真下に落としたときの着地 y 座標を返す (ハードドロップ先) */
export const dropY = (board: Board, piece: Piece): number => {
  let y = piece.y
  while (!collides(board, piece.shape, piece.x, y + 1)) {
    y++
  }
  return y
}

const stamp = (display: DisplayBoard, piece: Piece, y: number, ghost: boolean): void => {
  piece.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      const py = y + dy
      const px = piece.x + dx
      if (v && py >= 0 && py < ROWS && px >= 0 && px < COLS) {
        display[py][px] = { color: piece.color, ghost }
      }
    }),
  )
}

/**
 * 盤面 + 現在ミノ + ゴーストを合成した表示用ボードを返す。
 * piece が null の場合 (ゲームオーバー時など) はミノもゴーストも描画しない。
 * ゴーストを先に書き込み、現在ミノで上書きするため重なりは現在ミノが優先される。
 */
export const composeDisplay = (board: Board, piece: Piece | null): DisplayBoard => {
  const display: DisplayBoard = board.map((row) => row.map((color) => ({ color, ghost: false })))
  if (!piece) return display
  stamp(display, piece, dropY(board, piece), true)
  stamp(display, piece, piece.y, false)
  return display
}

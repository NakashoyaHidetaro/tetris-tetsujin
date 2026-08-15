import { COLS } from './constants'
import { tetrominoOf } from './tetrominoes'
import type { Piece, Shape, TetrominoType } from './types'

/** 種別からスポーン位置の Piece を作る (乱数を含まない純関数) */
export const createPiece = (type: TetrominoType): Piece => {
  const { shape, color } = tetrominoOf(type)
  return { shape, color, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

export const rotateShape = (shape: Shape): Shape =>
  shape[0].map((_, i) => shape.map((row) => row[i]).reverse())

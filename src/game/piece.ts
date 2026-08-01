import { COLS } from './constants'
import { TETROMINOES } from './tetrominoes'
import type { Piece, Shape } from './types'

export const randomPiece = (): Piece => {
  const { shape, color } = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)]
  return { shape, color, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

export const rotateShape = (shape: Shape): Shape =>
  shape[0].map((_, i) => shape.map((row) => row[i]).reverse())

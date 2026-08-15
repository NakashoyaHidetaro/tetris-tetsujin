import type { Shape, TetrominoType } from './types'

export interface Tetromino {
  type: TetrominoType
  shape: Shape
  color: string
}

export const TETROMINOES: Tetromino[] = [
  { type: 'I', shape: [[1, 1, 1, 1]], color: '#06b6d4' },
  { type: 'O', shape: [[1, 1], [1, 1]], color: '#eab308' },
  { type: 'T', shape: [[1, 1, 1], [0, 1, 0]], color: '#a855f7' },
  { type: 'S', shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  { type: 'Z', shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
  { type: 'J', shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  { type: 'L', shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
]

export const TETROMINO_TYPES: TetrominoType[] = TETROMINOES.map((t) => t.type)

const BY_TYPE = new Map<TetrominoType, Tetromino>(TETROMINOES.map((t) => [t.type, t]))

export const tetrominoOf = (type: TetrominoType): Tetromino => {
  const tetromino = BY_TYPE.get(type)
  if (!tetromino) throw new Error(`unknown tetromino type: ${type}`)
  return tetromino
}

import type { Shape } from './types'

export const TETROMINOES: { shape: Shape; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: '#06b6d4' }, // I
  { shape: [[1, 1], [1, 1]], color: '#eab308' }, // O
  { shape: [[1, 1, 1], [0, 1, 0]], color: '#a855f7' }, // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' }, // L
]

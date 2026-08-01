export type Cell = string | null
export type Board = Cell[][]
export type Shape = number[][]

export interface Piece {
  shape: Shape
  color: string
  x: number
  y: number
}

export interface GameState {
  board: Board
  piece: Piece
  pieceId: number
  score: number
  over: boolean
}

export type GameAction =
  | { type: 'tick' }
  | { type: 'move'; dx: -1 | 1 }
  | { type: 'rotate' }
  | { type: 'softDrop' }
  | { type: 'hardDrop'; pieceId: number }
  | { type: 'restart' }

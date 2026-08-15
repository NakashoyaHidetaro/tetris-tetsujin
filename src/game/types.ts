export type Cell = string | null
export type Board = Cell[][]
export type Shape = number[][]

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

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
  paused: boolean
  /** ネクスト表示用のキュー。常に QUEUE_SIZE (3) 個を保つ */
  queue: TetrominoType[]
  /** 現在の 7-bag の未配布ぶん */
  bag: TetrominoType[]
}

export type GameAction =
  | { type: 'tick' }
  | { type: 'move'; dx: -1 | 1 }
  | { type: 'rotate' }
  | { type: 'softDrop' }
  | { type: 'hardDrop'; pieceId: number }
  | { type: 'togglePause' }
  | { type: 'restart' }

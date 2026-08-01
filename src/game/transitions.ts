import { collides, emptyBoard } from './board'
import { COLS, ROWS } from './constants'
import { randomPiece, rotateShape } from './piece'
import { scoreForClear } from './scoring'
import type { Cell, GameState } from './types'

export const newGame = (): GameState => ({
  board: emptyBoard(),
  piece: randomPiece(),
  pieceId: 0,
  score: 0,
  over: false,
})

export const lockPiece = (state: GameState): GameState => {
  const board = state.board.map((row) => [...row])
  state.piece.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v && state.piece.y + dy >= 0) {
        board[state.piece.y + dy][state.piece.x + dx] = state.piece.color
      }
    }),
  )
  const remaining = board.filter((row) => row.some((cell) => cell === null))
  const cleared = ROWS - remaining.length
  while (remaining.length < ROWS) {
    remaining.unshift(Array<Cell>(COLS).fill(null))
  }
  const piece = randomPiece()
  return {
    board: remaining,
    piece,
    pieceId: state.pieceId + 1,
    score: state.score + scoreForClear(cleared),
    over: collides(remaining, piece.shape, piece.x, piece.y),
  }
}

export const step = (state: GameState): GameState => {
  if (state.over) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x, piece.y + 1)) {
    return lockPiece(state)
  }
  return { ...state, piece: { ...piece, y: piece.y + 1 } }
}

export const move = (state: GameState, dx: number): GameState => {
  if (state.over) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x + dx, piece.y)) return state
  return { ...state, piece: { ...piece, x: piece.x + dx } }
}

export const rotate = (state: GameState): GameState => {
  if (state.over) return state
  const { board, piece } = state
  const shape = rotateShape(piece.shape)
  if (collides(board, shape, piece.x, piece.y)) return state
  return { ...state, piece: { ...piece, shape } }
}

export const hardDrop = (state: GameState): GameState => {
  if (state.over) return state
  let { y } = state.piece
  while (!collides(state.board, state.piece.shape, state.piece.x, y + 1)) {
    y++
  }
  return lockPiece({ ...state, piece: { ...state.piece, y } })
}

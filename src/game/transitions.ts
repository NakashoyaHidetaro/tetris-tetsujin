import { draw, initialQueue } from './bag'
import { collides, dropY, emptyBoard } from './board'
import { COLS, ROWS } from './constants'
import { createPiece, rotateShape } from './piece'
import { scoreForClear } from './scoring'
import type { Cell, GameState } from './types'

export const newGame = (): GameState => {
  const start = initialQueue()
  const { type, queue, bag } = draw(start.queue, start.bag)
  return {
    board: emptyBoard(),
    piece: createPiece(type),
    pieceId: 0,
    score: 0,
    over: false,
    paused: false,
    queue,
    bag,
  }
}

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
  const { type, queue, bag } = draw(state.queue, state.bag)
  const piece = createPiece(type)
  return {
    ...state,
    board: remaining,
    piece,
    pieceId: state.pieceId + 1,
    score: state.score + scoreForClear(cleared),
    over: collides(remaining, piece.shape, piece.x, piece.y),
    queue,
    bag,
  }
}

/** over / paused 中は操作を受け付けない (同一参照を返して再レンダリングを避ける) */
const halted = (state: GameState): boolean => state.over || state.paused

export const step = (state: GameState): GameState => {
  if (halted(state)) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x, piece.y + 1)) {
    return lockPiece(state)
  }
  return { ...state, piece: { ...piece, y: piece.y + 1 } }
}

export const move = (state: GameState, dx: number): GameState => {
  if (halted(state)) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x + dx, piece.y)) return state
  return { ...state, piece: { ...piece, x: piece.x + dx } }
}

export const rotate = (state: GameState): GameState => {
  if (halted(state)) return state
  const { board, piece } = state
  const shape = rotateShape(piece.shape)
  if (collides(board, shape, piece.x, piece.y)) return state
  return { ...state, piece: { ...piece, shape } }
}

export const hardDrop = (state: GameState): GameState => {
  if (halted(state)) return state
  const y = dropY(state.board, state.piece)
  return lockPiece({ ...state, piece: { ...state.piece, y } })
}

/** ポーズの切り替え。over 中は無視して同一参照を返す */
export const togglePause = (state: GameState): GameState =>
  state.over ? state : { ...state, paused: !state.paused }

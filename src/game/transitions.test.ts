import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyBoard } from './board'
import { tetrominoOf } from './tetrominoes'
import { hardDrop, lockPiece, move, newGame, rotate, step, togglePause } from './transitions'
import type { GameState } from './types'

const square = [
  [1, 1],
  [1, 1],
]

const stateWith = (partial: Partial<GameState>): GameState => ({
  ...newGame(),
  ...partial,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('lockPiece', () => {
  it('揃った行を消して 100×n² を加点し、pieceId を進める', () => {
    const board = emptyBoard()
    for (let x = 0; x < 8; x++) {
      board[18][x] = '#fff'
      board[19][x] = '#fff'
    }
    const state = stateWith({
      board,
      piece: { shape: square, color: '#abc', x: 8, y: 18 },
      score: 0,
    })
    const next = lockPiece(state)
    expect(next.score).toBe(400)
    expect(next.board.flat().every((cell) => cell === null)).toBe(true)
    expect(next.pieceId).toBe(state.pieceId + 1)
  })

  it('次のミノがスポーン位置で衝突すると over になる', () => {
    const board = emptyBoard()
    for (let x = 0; x < 9; x++) {
      board[0][x] = '#fff'
    }
    const state = stateWith({
      board,
      piece: { shape: [[1]], color: '#abc', x: 9, y: 19 },
      // 次ミノを I に固定する (x=3..6, y=0 で board[0] の埋まったセルと衝突する)
      queue: ['I', 'O', 'T'],
      bag: ['S', 'Z', 'J', 'L'],
    })
    expect(lockPiece(state).over).toBe(true)
  })

  it('次ミノを queue の先頭から取り出し、queue を bag で補充する', () => {
    const state = stateWith({
      board: emptyBoard(),
      piece: { shape: square, color: '#abc', x: 0, y: 18 },
      queue: ['O', 'T', 'S'],
      bag: ['Z', 'J'],
    })
    const next = lockPiece(state)
    expect(next.piece.color).toBe(tetrominoOf('O').color)
    expect(next.queue).toEqual(['T', 'S', 'Z'])
    expect(next.bag).toEqual(['J'])
  })
})

describe('togglePause', () => {
  it('paused をトグルする', () => {
    const state = newGame()
    const paused = togglePause(state)
    expect(paused.paused).toBe(true)
    expect(togglePause(paused).paused).toBe(false)
  })

  it('over 中は同一の state 参照を返す', () => {
    const state = stateWith({ over: true })
    expect(togglePause(state)).toBe(state)
  })
})

describe('paused 中の遷移', () => {
  it('step / move / rotate / hardDrop が同一の state 参照を返す', () => {
    const state = stateWith({ paused: true })
    expect(step(state)).toBe(state)
    expect(move(state, 1)).toBe(state)
    expect(rotate(state)).toBe(state)
    expect(hardDrop(state)).toBe(state)
  })
})

describe('hardDrop', () => {
  it('現在のミノを最下段まで進めて固定する', () => {
    const state = stateWith({
      board: emptyBoard(),
      piece: { shape: square, color: '#abc', x: 4, y: 0 },
    })
    const next = hardDrop(state)
    expect(next.board[18][4]).toBe('#abc')
    expect(next.board[19][5]).toBe('#abc')
    expect(next.pieceId).toBe(state.pieceId + 1)
  })
})

describe('step', () => {
  it('over 状態では同一の state 参照を返す', () => {
    const state = stateWith({ over: true })
    expect(step(state)).toBe(state)
  })
})

import { describe, expect, it } from 'vitest'
import { bestPlacement } from './ai'
import { collides, dropY, emptyBoard } from './board'
import { COLS } from './constants'
import { createPiece, shapeFor } from './piece'
import type { Board, Rotation, TetrominoType } from './types'

/** 指定行の、渡した列を除いたセルを埋める */
const fillRow = (board: Board, y: number, holes: number[] = []): void => {
  for (let x = 0; x < COLS; x++) {
    if (!holes.includes(x)) board[y][x] = '#fff'
  }
}

/** 返された Placement が実際に置ける位置か (着地させても衝突しないか) */
const isPlaceable = (board: Board, type: TetrominoType, rotation: number, x: number): boolean => {
  const shape = shapeFor(type, rotation as Rotation)
  const piece = { ...createPiece(type), shape, x, y: -shape.length }
  const y = dropY(board, piece)
  return !collides(board, shape, x, y)
}

describe('bestPlacement', () => {
  it('平坦な盤面でどのミノにも有効な置き方を返す', () => {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    for (const type of types) {
      const board = emptyBoard()
      const placement = bestPlacement(board, createPiece(type))
      expect(placement).not.toBeNull()
      if (!placement) continue
      expect(placement.rotation).toBeGreaterThanOrEqual(0)
      expect(placement.rotation).toBeLessThanOrEqual(3)
      expect(isPlaceable(board, type, placement.rotation, placement.x)).toBe(true)
    }
  })

  it('1 ライン消去できる置き方を選ぶ', () => {
    const board = emptyBoard()
    fillRow(board, 19, [0, 1])
    expect(bestPlacement(board, createPiece('O'))).toEqual({ rotation: 0, x: 0 })
  })

  it('I ミノで 4 列ぶんの穴を埋めて消去する', () => {
    const board = emptyBoard()
    fillRow(board, 19, [3, 4, 5, 6])
    const placement = bestPlacement(board, createPiece('I'))
    expect(placement).not.toBeNull()
    // 横向き (rotation 0 / 2) で、埋まっていない 4 列にちょうど重なる
    expect((placement?.rotation ?? 0) % 2).toBe(0)
    expect(placement?.x).toBe(3)
  })

  it('穴を作る置き方を避ける', () => {
    // 列 9 だけ深さ 3 の井戸。x = 8 に O を置くと 3 マスの穴ができる
    const board = emptyBoard()
    for (const y of [17, 18, 19]) fillRow(board, y, [9])
    const placement = bestPlacement(board, createPiece('O'))
    expect(placement).not.toBeNull()
    expect(placement?.x).not.toBe(8)
  })

  it('井戸を埋められる縦向きを選ぶ', () => {
    // 列 0 だけ深さ 4 の井戸。I ミノは縦にして井戸を埋めるのが最善
    const board = emptyBoard()
    for (const y of [16, 17, 18, 19]) fillRow(board, y, [0])
    const placement = bestPlacement(board, createPiece('I'))
    expect(placement).not.toBeNull()
    expect((placement?.rotation ?? 0) % 2).toBe(1)
  })

  it('置ける場所がなければ null を返す', () => {
    const board = emptyBoard()
    for (let y = 0; y < 20; y++) fillRow(board, y, [0])
    expect(bestPlacement(board, createPiece('O'))).toBeNull()
  })
})

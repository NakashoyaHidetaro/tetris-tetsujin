import { describe, expect, it } from 'vitest'
import { collides, emptyBoard } from './board'

const square = [
  [1, 1],
  [1, 1],
]

describe('collides', () => {
  it('左右の壁の外に出ると衝突する', () => {
    const board = emptyBoard()
    expect(collides(board, square, -1, 0)).toBe(true)
    expect(collides(board, square, 9, 0)).toBe(true)
    expect(collides(board, square, 8, 0)).toBe(false)
  })

  it('床を突き抜けると衝突する', () => {
    const board = emptyBoard()
    expect(collides(board, square, 0, 19)).toBe(true)
    expect(collides(board, square, 0, 18)).toBe(false)
  })

  it('既存セルと重なると衝突する', () => {
    const board = emptyBoard()
    board[5][3] = '#fff'
    expect(collides(board, square, 3, 5)).toBe(true)
    expect(collides(board, square, 3, 3)).toBe(false)
  })

  it('盤面上部 (y < 0) へのはみ出しは衝突にしない', () => {
    expect(collides(emptyBoard(), square, 3, -1)).toBe(false)
  })
})

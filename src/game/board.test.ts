import { describe, expect, it } from 'vitest'
import { collides, composeDisplay, dropY, emptyBoard } from './board'
import type { Piece } from './types'

const square = [
  [1, 1],
  [1, 1],
]

const squarePiece = (x: number, y: number): Piece => ({
  shape: square,
  color: '#0ff',
  x,
  y,
})

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

describe('dropY', () => {
  it('空の盤面では床まで落ちる', () => {
    expect(dropY(emptyBoard(), squarePiece(3, 0))).toBe(18)
  })

  it('既存ブロックの上で止まる', () => {
    const board = emptyBoard()
    board[10][3] = '#fff'
    expect(dropY(board, squarePiece(3, 0))).toBe(8)
  })

  it('すでに着地しているミノは現在位置を返す', () => {
    expect(dropY(emptyBoard(), squarePiece(3, 18))).toBe(18)
  })

  it('列ごとの高さが違っても最も高い列で止まる', () => {
    const board = emptyBoard()
    board[15][3] = '#fff'
    board[10][4] = '#fff'
    expect(dropY(board, squarePiece(3, 0))).toBe(8)
  })
})

describe('composeDisplay', () => {
  it('現在ミノを色付きの非ゴーストとして描画する', () => {
    const display = composeDisplay(emptyBoard(), squarePiece(3, 0))
    expect(display[0][3]).toEqual({ color: '#0ff', ghost: false })
    expect(display[1][4]).toEqual({ color: '#0ff', ghost: false })
  })

  it('着地位置にゴーストを描画する', () => {
    const display = composeDisplay(emptyBoard(), squarePiece(3, 0))
    expect(display[18][3]).toEqual({ color: '#0ff', ghost: true })
    expect(display[19][4]).toEqual({ color: '#0ff', ghost: true })
  })

  it('ゴーストは横移動に追従する', () => {
    const display = composeDisplay(emptyBoard(), squarePiece(7, 0))
    expect(display[19][7].ghost).toBe(true)
    expect(display[19][3].color).toBeNull()
  })

  it('ゴーストは盤面の既存ブロックの上に乗る', () => {
    const board = emptyBoard()
    board[10][3] = '#fff'
    const display = composeDisplay(board, squarePiece(3, 0))
    expect(display[9][3].ghost).toBe(true)
    expect(display[8][3].ghost).toBe(true)
    expect(display[10][3]).toEqual({ color: '#fff', ghost: false })
  })

  it('現在ミノとゴーストが重なる場合は現在ミノを優先する', () => {
    const display = composeDisplay(emptyBoard(), squarePiece(3, 18))
    expect(display[18][3]).toEqual({ color: '#0ff', ghost: false })
    expect(display[19][3]).toEqual({ color: '#0ff', ghost: false })
  })

  it('一部だけ重なる場合も重なった部分は現在ミノ優先になる', () => {
    const display = composeDisplay(emptyBoard(), squarePiece(3, 17))
    expect(display[17][3]).toEqual({ color: '#0ff', ghost: false })
    expect(display[18][3]).toEqual({ color: '#0ff', ghost: false })
    expect(display[19][3]).toEqual({ color: '#0ff', ghost: true })
  })

  it('piece が null なら盤面のみを描画する (ゲームオーバー時)', () => {
    const board = emptyBoard()
    board[19][0] = '#fff'
    const display = composeDisplay(board, null)
    expect(display[19][0]).toEqual({ color: '#fff', ghost: false })
    expect(display.every((row) => row.every((cell) => !cell.ghost))).toBe(true)
    expect(display[0].every((cell) => cell.color === null)).toBe(true)
  })

  it('元の盤面を破壊しない', () => {
    const board = emptyBoard()
    composeDisplay(board, squarePiece(3, 0))
    expect(board.every((row) => row.every((cell) => cell === null))).toBe(true)
  })

  it('盤面上部にはみ出した (y < 0) ミノ部分は描画しない', () => {
    const display = composeDisplay(emptyBoard(), squarePiece(3, -1))
    expect(display[0][3]).toEqual({ color: '#0ff', ghost: false })
    expect(display).toHaveLength(20)
  })
})

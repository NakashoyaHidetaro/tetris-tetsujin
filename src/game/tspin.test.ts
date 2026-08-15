import { describe, expect, it } from 'vitest'
import { emptyBoard } from './board'
import { createPiece, shapeFor } from './piece'
import { detectTSpin } from './tspin'
import type { Board, Piece } from './types'

/** 下向き (rotation 2) の T を (x, y) の 3x3 ボックスに置く */
const downT = (x: number, y: number): Piece => ({
  ...createPiece('T'),
  shape: shapeFor('T', 2),
  rotation: 2,
  x,
  y,
})

const boardWith = (cells: [number, number][]): Board => {
  const board = emptyBoard()
  cells.forEach(([y, x]) => {
    board[y][x] = '#fff'
  })
  return board
}

describe('detectTSpin', () => {
  it('T 以外は判定しない', () => {
    expect(detectTSpin(emptyBoard(), createPiece('J'), 0)).toBe('none')
  })

  it('4 隅のうち 2 つ以下なら none', () => {
    // 左上と左下だけ埋める
    const board = boardWith([
      [17, 3],
      [19, 3],
    ])
    expect(detectTSpin(board, downT(3, 17), 0)).toBe('none')
  })

  it('3 隅 + 凸側 (下向きなら下の 2 隅) が埋まっていれば tspin', () => {
    const board = boardWith([
      [17, 3],
      [19, 3],
      [19, 5],
    ])
    expect(detectTSpin(board, downT(3, 17), 0)).toBe('tspin')
  })

  it('3 隅でも凸側が片方しか埋まっていなければ mini', () => {
    const board = boardWith([
      [17, 3],
      [17, 5],
      [19, 3],
    ])
    expect(detectTSpin(board, downT(3, 17), 0)).toBe('mini')
  })

  it('最後のキック候補 (index 4) で成立した回転は mini を tspin へ格上げする', () => {
    const board = boardWith([
      [17, 3],
      [17, 5],
      [19, 3],
    ])
    expect(detectTSpin(board, downT(3, 17), 4)).toBe('tspin')
  })

  it('左右の壁と床は埋まっているものとして数える', () => {
    // 左端 (x = -1) と床 (y = 20) が隅にかかる位置。盤面のブロックは
    // 右上 (0, 1) の 1 つだけでも 3 隅を満たす
    const board = boardWith([[17, 1]])
    const piece = { ...downT(-1, 17), y: 17 }
    expect(detectTSpin(board, piece, 0)).not.toBe('none')
  })

  it('天井の外 (y < 0) は空きとして扱う', () => {
    const board = emptyBoard()
    expect(detectTSpin(board, downT(3, -2), 0)).toBe('none')
  })
})

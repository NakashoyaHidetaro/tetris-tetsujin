import { describe, expect, it } from 'vitest'
import { emptyBoard } from './board'
import { createPiece, shapeFor } from './piece'
import { nextRotation, tryRotate } from './srs'
import type { Board, Piece } from './types'

const at = (type: Parameters<typeof createPiece>[0], x: number, y: number, rotation = 0): Piece => ({
  ...createPiece(type),
  x,
  y,
  rotation: rotation as 0 | 1 | 2 | 3,
  shape: shapeFor(type, rotation as 0 | 1 | 2 | 3),
})

/** 指定セルを埋めた盤面 */
const boardWith = (cells: [number, number][]): Board => {
  const board = emptyBoard()
  cells.forEach(([y, x]) => {
    board[y][x] = '#fff'
  })
  return board
}

describe('nextRotation', () => {
  it('cw で +1、ccw で -1 の巡回', () => {
    expect(nextRotation(0, 'cw')).toBe(1)
    expect(nextRotation(3, 'cw')).toBe(0)
    expect(nextRotation(0, 'ccw')).toBe(3)
    expect(nextRotation(1, 'ccw')).toBe(0)
  })
})

describe('tryRotate', () => {
  it('O ミノは回転しても位置が変わらないので null を返す', () => {
    expect(tryRotate(emptyBoard(), createPiece('O'), 'cw')).toBeNull()
  })

  it('空きがあれば補正なし (kickIndex 0) で回る', () => {
    const result = tryRotate(emptyBoard(), at('T', 3, 5), 'cw')
    expect(result).not.toBeNull()
    expect(result?.kickIndex).toBe(0)
    expect(result?.piece.rotation).toBe(1)
    expect(result?.piece.x).toBe(3)
    expect(result?.piece.y).toBe(5)
  })

  it('回転先がブロックで塞がれていると左へ 1 ずれて成立する (JLSTZ 0>>1 の候補 1)', () => {
    // 0>>1 で T の縦棒が入る (7, 4) を塞ぐと、候補 0 が失敗して
    // 候補 1 = (-1, 0) で x が 1 減る
    const board = boardWith([[7, 4]])
    const result = tryRotate(board, at('T', 3, 5), 'cw')
    expect(result).not.toBeNull()
    expect(result?.kickIndex).toBe(1)
    expect(result?.piece.x).toBe(2)
    expect(result?.piece.rotation).toBe(1)
  })

  it('I ミノは左壁際で右へずれて回る (I の 1>>2 キック)', () => {
    // rotation 1 の I は 4x4 ボックスの 3 列目に縦に立つ。x = -2 なら縦棒は
    // x = 0。ここから 2 (横向き) へ回すと x = -2..1 で壁を突き抜けるため、
    // 候補 2 = (+2, 0) で x = 0 (横棒 x = 0..3) に補正される
    const piece = at('I', -2, 5, 1)
    const result = tryRotate(emptyBoard(), piece, 'cw')
    expect(result).not.toBeNull()
    expect(result?.piece.x).toBe(0)
    expect(result?.kickIndex).toBe(2)
  })

  it('すべての候補が塞がっていれば null (回転拒否)', () => {
    // T をぴったり囲んで、どのオフセットでも入れないようにする
    const board = emptyBoard()
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 10; x++) {
        board[y][x] = '#fff'
      }
    }
    expect(tryRotate(board, at('T', 3, 5), 'cw')).toBeNull()
  })

  it('T-スピンダブルの窪みへ最後のキック候補で入り込む', () => {
    // 右向き (rotation 1) の T が、左へ回って床の窪みへ落ち込む形
    //   ####.#####   (y = 17)
    //   ###...####   (y = 18)  ← 窪み
    //   ####.#####   (y = 19)
    const filled: [number, number][] = []
    for (let x = 0; x < 10; x++) {
      if (x !== 4) filled.push([17, x])
      if (x !== 3 && x !== 4 && x !== 5) filled.push([18, x])
      if (x !== 4) filled.push([19, x])
    }
    const board = boardWith(filled)
    // 縦向き (rotation 3 = 左向き) の T を窪みの上に置き、cw で 0 へ回す代わりに
    // rotation 1 → 2 (下向き) へ回して潜り込ませる
    const piece = at('T', 3, 15, 1)
    const result = tryRotate(board, piece, 'cw')
    expect(result).not.toBeNull()
    expect(result?.piece.rotation).toBe(2)
  })
})

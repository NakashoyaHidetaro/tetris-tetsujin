import { collides, dropY } from './board'
import { COLS, ROWS } from './constants'
import { shapeFor } from './piece'
import type { Board, Cell, Piece, Rotation, Shape, TetrominoType } from './types'

/** 自動プレイが選ぶ着地先 (回転状態と、そのときの左上 x)。y はハードドロップで決まる */
export interface Placement {
  rotation: number
  x: number
}

/**
 * ミノごとの「実質的に異なる回転状態」の数。
 * O は 4 回転すべて同形、I / S / Z は 2 回転で元に戻るため、
 * ここを超える回転は同じ盤面を重複評価するだけなので列挙しない
 */
const ROTATION_COUNT: Record<TetrominoType, number> = {
  I: 2,
  O: 1,
  T: 4,
  S: 2,
  Z: 2,
  J: 4,
  L: 4,
}

/**
 * 評価の重み (el-tetris / Dellacherie 系の古典的な値)。
 * 消去ラインだけが加点で、残りはすべて減点
 */
const W_LINES = 0.76
const W_HEIGHT = -0.51
const W_HOLES = -0.36
const W_BUMPINESS = -0.18
/** 高く積み上がった盤面はミスの余地が小さいので、最大高さも軽く減点する */
const W_MAX_HEIGHT = -0.1

interface Landing {
  board: Board
  cleared: number
}

/**
 * ミノを (x, y) に固定した盤面と、そこで揃った行数を返す。
 * 元の盤面は破壊しない
 */
const land = (board: Board, shape: Shape, x: number, y: number): Landing => {
  const next = board.map((row) => [...row])
  shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v) next[y + dy][x + dx] = '#'
    }),
  )
  const remaining = next.filter((row) => row.some((cell) => cell === null))
  const cleared = ROWS - remaining.length
  while (remaining.length < ROWS) remaining.unshift(Array<Cell>(COLS).fill(null))
  return { board: remaining, cleared }
}

/** 列ごとの高さ (最上段の埋まったセルから床までの段数。空の列は 0) */
const columnHeights = (board: Board): number[] =>
  Array.from({ length: COLS }, (_, x) => {
    for (let y = 0; y < ROWS; y++) {
      if (board[y][x] !== null) return ROWS - y
    }
    return 0
  })

/** 各列で、最上段の埋まったセルより下にある空セルの総数 */
const countHoles = (board: Board, heights: number[]): number => {
  let holes = 0
  for (let x = 0; x < COLS; x++) {
    for (let y = ROWS - heights[x]; y < ROWS; y++) {
      if (board[y][x] === null) holes++
    }
  }
  return holes
}

/** 隣り合う列の高さ差の総和 (でこぼこ具合) */
const bumpiness = (heights: number[]): number => {
  let total = 0
  for (let x = 0; x < COLS - 1; x++) total += Math.abs(heights[x] - heights[x + 1])
  return total
}

/** 着地後の盤面の良さ。大きいほど良い */
const evaluate = ({ board, cleared }: Landing): number => {
  const heights = columnHeights(board)
  const aggregate = heights.reduce((a, b) => a + b, 0)
  return (
    W_LINES * cleared +
    W_HEIGHT * aggregate +
    W_HOLES * countHoles(board, heights) +
    W_BUMPINESS * bumpiness(heights) +
    W_MAX_HEIGHT * Math.max(...heights)
  )
}

/**
 * 現在ミノの置き方 (回転 × 横位置) をすべて試し、着地後の盤面評価が最も高いものを返す。
 * どこにも置けない場合は null
 */
export const bestPlacement = (board: Board, piece: Piece): Placement | null => {
  let best: Placement | null = null
  let bestScore = -Infinity

  for (let rotation = 0; rotation < ROTATION_COUNT[piece.type]; rotation++) {
    const shape = shapeFor(piece.type, rotation as Rotation)
    // 形状は余白込みの外接ボックスなので、実際に埋まっている最上段を見ておく
    const top = shape.findIndex((row) => row.some(Boolean))
    // 盤面より完全に上の位置から落とすので、開始位置での衝突は左右のはみ出しだけ
    const startY = -shape.length
    for (let x = -shape[0].length + 1; x < COLS; x++) {
      if (collides(board, shape, x, startY)) continue
      const y = dropY(board, { ...piece, shape, x, y: startY })
      // 盤面上部にはみ出したまま止まる置き方 (積み上がりすぎ) は候補にしない
      if (y + top < 0) continue
      const score = evaluate(land(board, shape, x, y))
      if (score > bestScore) {
        bestScore = score
        best = { rotation, x }
      }
    }
  }

  return best
}

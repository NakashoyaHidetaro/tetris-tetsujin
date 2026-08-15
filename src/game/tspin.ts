import { COLS, ROWS } from './constants'
import type { Board, Piece, Rotation } from './types'

export type TSpinKind = 'none' | 'mini' | 'tspin'

/** 最後のキック候補 (index 4) が成立した回転は Mini を通常の T-スピンへ格上げする */
const UPGRADE_KICK_INDEX = 4

/**
 * 判定用のセル占有。左右の壁と床は占有扱い、天井 (y < 0) は collides と同じく
 * 空き扱いにする (盤面外の上方向にはブロックが存在しないため)
 */
const occupied = (board: Board, x: number, y: number): boolean => {
  if (x < 0 || x >= COLS || y >= ROWS) return true
  if (y < 0) return false
  return board[y][x] !== null
}

/**
 * T ミノの 3x3 ボックスの 4 隅。index は
 * 0 = 左上 / 1 = 右上 / 2 = 左下 / 3 = 右下
 */
const corners = (board: Board, piece: Piece): boolean[] => [
  occupied(board, piece.x, piece.y),
  occupied(board, piece.x + 2, piece.y),
  occupied(board, piece.x, piece.y + 2),
  occupied(board, piece.x + 2, piece.y + 2),
]

/** 回転状態ごとの「凸側 (T の突起が向く辺)」の 2 隅の index */
const FRONT: Record<Rotation, [number, number]> = {
  0: [0, 1], // 上向き → 上の 2 隅
  1: [1, 3], // 右向き → 右の 2 隅
  2: [2, 3], // 下向き → 下の 2 隅
  3: [0, 2], // 左向き → 左の 2 隅
}

/**
 * 3-corner 方式の T-スピン判定 (PRD #12)。
 *
 * - 判定は T ミノに限り、呼び出し側が「ロック直前の成功操作が回転であること」を保証する
 * - 4 隅のうち 3 つ以上が占有されていれば T-スピン成立
 * - 凸側の 2 隅が両方埋まっていなければ Mini。ただし最後のキック候補で成立した
 *   回転は通常の T-スピンへ格上げする (ガイドライン準拠)
 *
 * PRD #12 により Mini は T-スピンとして公開しない (呼び出し側で通常のライン表を使う)
 */
export const detectTSpin = (board: Board, piece: Piece, kickIndex: number): TSpinKind => {
  if (piece.type !== 'T') return 'none'
  const filled = corners(board, piece)
  if (filled.filter(Boolean).length < 3) return 'none'
  const [a, b] = FRONT[piece.rotation]
  if (filled[a] && filled[b]) return 'tspin'
  return kickIndex === UPGRADE_KICK_INDEX ? 'tspin' : 'mini'
}

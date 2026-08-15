import { collides } from './board'
import { shapeFor } from './piece'
import type { Board, Piece, Rotation, RotationDir } from './types'

/** キック候補 1 件。[dx, dy] で、dy は「上向きが正」の SRS 慣習 */
export type Kick = readonly [number, number]

const NO_KICK: Kick[] = [[0, 0]]

/**
 * SRS 壁キックテーブル (PRD #12)。キーは `${from}${to}` の回転状態ペア。
 * オフセットは Tetris ガイドラインの表記どおり **y 軸上向きが正** で書いてあり、
 * 本実装の盤面は y 下向きが正なので、適用時に dy の符号を反転する
 */
const JLSTZ_KICKS: Record<string, Kick[]> = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

const I_KICKS: Record<string, Kick[]> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

export const nextRotation = (rotation: Rotation, dir: RotationDir): Rotation =>
  (((rotation + (dir === 'cw' ? 1 : 3)) % 4) as Rotation)

/** 種別と回転状態ペアに対応するキック候補列。O は回転位置が変わらないので (0,0) のみ */
export const kicksFor = (piece: Piece, to: Rotation): Kick[] => {
  if (piece.type === 'O') return NO_KICK
  const key = `${piece.rotation}${to}`
  return (piece.type === 'I' ? I_KICKS : JLSTZ_KICKS)[key] ?? NO_KICK
}

export interface RotationResult {
  piece: Piece
  /** 成立したキック候補の index。0 は無補正での回転成立 */
  kickIndex: number
}

/**
 * SRS 準拠の回転を試みる。候補を順に試し、最初に衝突しないものを採用する。
 * すべて失敗した場合と、O ミノ (回転しても見た目・位置が変わらない) は null を返す
 */
export const tryRotate = (
  board: Board,
  piece: Piece,
  dir: RotationDir = 'cw',
): RotationResult | null => {
  if (piece.type === 'O') return null
  const rotation = nextRotation(piece.rotation, dir)
  const shape = shapeFor(piece.type, rotation)
  const kicks = kicksFor(piece, rotation)
  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i]
    const x = piece.x + dx
    // SRS の +y は上方向。盤面の y は下方向が正なので反転して足す
    const y = piece.y - dy
    if (!collides(board, shape, x, y)) {
      return { piece: { ...piece, shape, rotation, x, y }, kickIndex: i }
    }
  }
  return null
}

import { COLS } from './constants'
import { tetrominoOf } from './tetrominoes'
import type { Piece, Rotation, Shape, TetrominoType } from './types'

/** 形状を時計回りに 90° 回転する (外接ボックスごと回すので SRS の回転状態になる) */
export const rotateShape = (shape: Shape): Shape =>
  shape[0].map((_, i) => shape.map((row) => row[i]).reverse())

/** 種別 + 回転状態 → 形状。スポーン形状に rotateShape を n 回かけた結果をキャッシュする */
const SHAPES = new Map<string, Shape>()

export const shapeFor = (type: TetrominoType, rotation: Rotation): Shape => {
  const key = `${type}${rotation}`
  const cached = SHAPES.get(key)
  if (cached) return cached
  let shape = tetrominoOf(type).shape
  for (let i = 0; i < rotation; i++) shape = rotateShape(shape)
  SHAPES.set(key, shape)
  return shape
}

/** 種別からスポーン位置の Piece を作る (乱数を含まない純関数) */
export const createPiece = (type: TetrominoType): Piece => {
  const { color } = tetrominoOf(type)
  const shape = shapeFor(type, 0)
  return {
    type,
    shape,
    color,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
    rotation: 0,
  }
}

/**
 * 形状から空の行・列を取り除く。SRS 用の形状は 3x3 / 4x4 の余白込みなので、
 * ネクスト / ホールドのプレビュー表示ではこれで詰めて描く
 */
export const trimShape = (shape: Shape): Shape => {
  const rows = shape.filter((row) => row.some(Boolean))
  if (rows.length === 0) return []
  const cols = shape[0].map((_, x) => shape.some((row) => row[x]))
  const first = cols.indexOf(true)
  const last = cols.lastIndexOf(true)
  return rows.map((row) => row.slice(first, last + 1))
}

import type { Shape, TetrominoType } from './types'

export interface Tetromino {
  type: TetrominoType
  shape: Shape
  /**
   * ミノ色。テーマ / パレット切替 (PRD #9, #17) に追従できるよう、実際の
   * 色値ではなく CSS カスタムプロパティ参照を持つ。値は index.css で定義する
   */
  color: string
}

/**
 * スポーン時 (rotation = 0) の形状。SRS のキックテーブルは
 * 「I は 4x4、JLSTZ は 3x3、O は 2x2 の外接ボックスを回す」前提で定義されて
 * いるため、余白の行・列を含めたボックスのまま保持する (PRD #12)。
 * 表示側でボックスの余白を詰めたい場合は piece.ts の trimShape を使う
 */
export const TETROMINOES: Tetromino[] = [
  {
    type: 'I',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 'var(--mino-i)',
  },
  { type: 'O', shape: [[1, 1], [1, 1]], color: 'var(--mino-o)' },
  {
    type: 'T',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--mino-t)',
  },
  {
    type: 'S',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: 'var(--mino-s)',
  },
  {
    type: 'Z',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--mino-z)',
  },
  {
    type: 'J',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--mino-j)',
  },
  {
    type: 'L',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 'var(--mino-l)',
  },
]

export const TETROMINO_TYPES: TetrominoType[] = TETROMINOES.map((t) => t.type)

const BY_TYPE = new Map<TetrominoType, Tetromino>(TETROMINOES.map((t) => [t.type, t]))

const BY_COLOR = new Map<string, TetrominoType>(TETROMINOES.map((t) => [t.color, t.type]))

export const tetrominoOf = (type: TetrominoType): Tetromino => {
  const tetromino = BY_TYPE.get(type)
  if (!tetromino) throw new Error(`unknown tetromino type: ${type}`)
  return tetromino
}

/**
 * 盤面セルは色文字列しか持たないため、記号表示 (PRD #17) 用に色から
 * ミノ種別を逆引きする。未知の色 (テスト用のダミー等) は null
 */
export const tetrominoTypeOfColor = (color: string | null): TetrominoType | null =>
  color === null ? null : (BY_COLOR.get(color) ?? null)

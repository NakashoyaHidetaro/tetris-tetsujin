import { describe, expect, it } from 'vitest'
import { emptyBoard } from '../../game/board'
import type { Board, Piece } from '../../game/types'
import { detectSoundEvents, type SoundSnapshot } from './events'

/**
 * 効果音イベント検出 (PRD #8) のテスト。
 * 発音そのものは Web Audio なので jsdom では鳴らせないが、
 * 「どの差分でどの音を鳴らすか」は純関数なのでここで固められる。
 */

// 横 2 マスの単純なミノ (回転差分の検証用に O 型ではなく非対称形も使う)
const FLAT: number[][] = [[1, 1]]
const TALL: number[][] = [[1], [1]]

const piece = (over: Partial<Piece> = {}): Piece => ({
  type: 'I',
  shape: FLAT,
  rotation: 0,
  color: '#0ff',
  x: 4,
  y: 0,
  ...over,
})

const snapshot = (over: Partial<SoundSnapshot> = {}): SoundSnapshot => ({
  board: emptyBoard(),
  piece: piece(),
  pieceId: 1,
  lines: 0,
  level: 1,
  over: false,
  paused: false,
  ...over,
})

/** 最下段に着地した状態のミノ (これ以上落ちられない = 通常ロック相当) */
const resting = (board: Board): Piece => piece({ y: board.length - 1 })

describe('detectSoundEvents', () => {
  it('初回 (prev が null) は何も鳴らさない', () => {
    expect(detectSoundEvents(null, snapshot())).toEqual([])
  })

  it('変化がなければ何も鳴らさない', () => {
    const s = snapshot()
    expect(detectSoundEvents(s, { ...s })).toEqual([])
  })

  it('x の変化で move', () => {
    const prev = snapshot()
    const next = snapshot({ piece: piece({ x: 5 }) })
    expect(detectSoundEvents(prev, next)).toEqual(['move'])
  })

  it('形状の変化で rotate (キックで x が動いても rotate 優先)', () => {
    const prev = snapshot()
    const next = snapshot({ piece: piece({ shape: TALL, x: 5 }) })
    expect(detectSoundEvents(prev, next)).toEqual(['rotate'])
  })

  it('y だけの変化 (自然落下 / ソフトドロップ) では鳴らさない', () => {
    const prev = snapshot()
    const next = snapshot({ piece: piece({ y: 1 }) })
    expect(detectSoundEvents(prev, next)).toEqual([])
  })

  it('接地状態からの pieceId 更新は lock', () => {
    const board = emptyBoard()
    const prev = snapshot({ board, piece: resting(board) })
    const next = snapshot({ pieceId: 2 })
    expect(detectSoundEvents(prev, next)).toEqual(['lock'])
  })

  it('宙に浮いた位置からの pieceId 更新は hardDrop', () => {
    const prev = snapshot({ piece: piece({ y: 0 }) })
    const next = snapshot({ pieceId: 2 })
    expect(detectSoundEvents(prev, next)).toEqual(['hardDrop'])
  })

  it('消去ライン数に応じた音を鳴らす', () => {
    const board = emptyBoard()
    const prev = snapshot({ board, piece: resting(board) })
    const cases: [number, string][] = [
      [1, 'clearSingle'],
      [2, 'clearDouble'],
      [3, 'clearTriple'],
      [4, 'tetris'],
    ]
    for (const [count, event] of cases) {
      const next = snapshot({ pieceId: 2, lines: count })
      expect(detectSoundEvents(prev, next)).toEqual(['lock', event])
    }
  })

  it('level の増加で levelUp が続く', () => {
    const board = emptyBoard()
    const prev = snapshot({ board, piece: resting(board), lines: 8 })
    const next = snapshot({ pieceId: 2, lines: 10, level: 2 })
    expect(detectSoundEvents(prev, next)).toEqual(['lock', 'clearDouble', 'levelUp'])
  })

  it('over への遷移で gameOver', () => {
    const prev = snapshot()
    const next = snapshot({ over: true })
    expect(detectSoundEvents(prev, next)).toContain('gameOver')
  })

  it('over 中の再描画では gameOver を繰り返さない', () => {
    const prev = snapshot({ over: true })
    const next = snapshot({ over: true })
    expect(detectSoundEvents(prev, next)).toEqual([])
  })

  it('ポーズ / 再開でそれぞれの音', () => {
    const running = snapshot()
    const paused = snapshot({ paused: true })
    expect(detectSoundEvents(running, paused)).toEqual(['pause'])
    expect(detectSoundEvents(paused, running)).toEqual(['resume'])
  })

  it('リスタート (over 解除 / カウンタ巻き戻し) は restart 単独', () => {
    const prev = snapshot({ over: true, pieceId: 40, lines: 12, level: 2 })
    const next = snapshot({ pieceId: 1, lines: 0, level: 1 })
    expect(detectSoundEvents(prev, next)).toEqual(['restart'])
  })

  it('piece が null でも落ちない', () => {
    const prev = snapshot({ piece: null })
    const next = snapshot({ piece: null, pieceId: 2 })
    expect(detectSoundEvents(prev, next)).toEqual(['lock'])
  })
})

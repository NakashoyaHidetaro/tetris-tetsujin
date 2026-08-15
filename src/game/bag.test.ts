import { describe, expect, it } from 'vitest'
import { QUEUE_SIZE, draw, initialQueue, newBag, shuffle } from './bag'
import { TETROMINO_TYPES } from './tetrominoes'
import { newGame } from './transitions'
import type { GameState, TetrominoType } from './types'

const SEED = 12345

const countByType = (types: TetrominoType[]) => {
  const counts = new Map<TetrominoType, number>()
  for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1)
  return counts
}

/** state から n 個ぶんの種別を順に取り出す */
const drawSequence = (
  state: Pick<GameState, 'queue' | 'bag' | 'seed'>,
  n: number,
): TetrominoType[] => {
  let { queue, bag, seed } = state
  const types: TetrominoType[] = []
  for (let i = 0; i < n; i++) {
    const next = draw(queue, bag, seed)
    types.push(next.type)
    queue = next.queue
    bag = next.bag
    seed = next.seed
    expect(queue).toHaveLength(QUEUE_SIZE)
  }
  return types
}

describe('shuffle', () => {
  it('元の配列を破壊せず、同じ要素の並べ替えを返す', () => {
    const source = [1, 2, 3, 4, 5]
    const { result } = shuffle(source, SEED)
    expect(source).toEqual([1, 2, 3, 4, 5])
    expect([...result].sort()).toEqual(source)
  })

  it('同じ seed なら同じ並びを返し、消費後の seed も一致する (決定論性)', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7], SEED)
    const b = shuffle([1, 2, 3, 4, 5, 6, 7], SEED)
    expect(a.result).toEqual(b.result)
    expect(a.seed).toBe(b.seed)
  })

  it('異なる seed では乱数状態が異なる値へ進む', () => {
    expect(shuffle([1, 2, 3, 4], SEED).seed).not.toBe(shuffle([1, 2, 3, 4], SEED + 1).seed)
  })
})

describe('newBag', () => {
  it('7 種をちょうど 1 個ずつ含む', () => {
    const { result } = newBag(SEED)
    expect(result).toHaveLength(7)
    expect([...result].sort()).toEqual([...TETROMINO_TYPES].sort())
  })
})

describe('7-bag', () => {
  it('最初の 7 個で 7 種が各 1 回ずつ出る', () => {
    const types = drawSequence(initialQueue(SEED), 7)
    expect(countByType(types)).toEqual(countByType([...TETROMINO_TYPES]))
  })

  it('14 個で各 2 回ずつ出る', () => {
    const types = drawSequence(initialQueue(SEED), 14)
    for (const type of TETROMINO_TYPES) {
      expect(types.filter((t) => t === type)).toHaveLength(2)
    }
  })

  it('7 個ごとの区切りでは必ず 7 種が揃う (bag 境界をまたがない)', () => {
    const types = drawSequence(initialQueue(SEED), 21)
    for (let i = 0; i < 21; i += 7) {
      expect([...types.slice(i, i + 7)].sort()).toEqual([...TETROMINO_TYPES].sort())
    }
  })

  it('同じ seed から始めれば出現列が完全に一致する (リプレイの前提)', () => {
    expect(drawSequence(initialQueue(SEED), 30)).toEqual(drawSequence(initialQueue(SEED), 30))
  })
})

describe('queue', () => {
  it('initialQueue は QUEUE_SIZE 個の queue と残りの bag を返す', () => {
    const { queue, bag } = initialQueue(SEED)
    expect(queue).toHaveLength(QUEUE_SIZE)
    expect(bag).toHaveLength(7 - QUEUE_SIZE)
  })

  it('seed 省略時はランダムシードで初期化される (queue の不変条件は同じ)', () => {
    expect(initialQueue().queue).toHaveLength(QUEUE_SIZE)
  })

  it('newGame の queue は QUEUE_SIZE 個ある', () => {
    expect(newGame().queue).toHaveLength(QUEUE_SIZE)
  })

  it('draw を繰り返しても queue は常に QUEUE_SIZE 個を保つ', () => {
    drawSequence(newGame(), 30)
  })
})

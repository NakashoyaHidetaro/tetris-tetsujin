import { afterEach, describe, expect, it, vi } from 'vitest'
import { QUEUE_SIZE, draw, initialQueue, newBag, shuffle } from './bag'
import { TETROMINO_TYPES } from './tetrominoes'
import { newGame } from './transitions'
import type { GameState, TetrominoType } from './types'

afterEach(() => {
  vi.restoreAllMocks()
})

/** Math.random が決まった列を順に返すようにする */
const mockRandom = (values: number[]) => {
  let i = 0
  vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length])
}

const countByType = (types: TetrominoType[]) => {
  const counts = new Map<TetrominoType, number>()
  for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1)
  return counts
}

/** state から n 個ぶんの種別を順に取り出す */
const drawSequence = (state: Pick<GameState, 'queue' | 'bag'>, n: number): TetrominoType[] => {
  let { queue, bag } = state
  const types: TetrominoType[] = []
  for (let i = 0; i < n; i++) {
    const next = draw(queue, bag)
    types.push(next.type)
    queue = next.queue
    bag = next.bag
    expect(queue).toHaveLength(QUEUE_SIZE)
  }
  return types
}

describe('shuffle', () => {
  it('元の配列を破壊せず、同じ要素の並べ替えを返す', () => {
    const source = [1, 2, 3, 4, 5]
    const result = shuffle(source)
    expect(source).toEqual([1, 2, 3, 4, 5])
    expect([...result].sort()).toEqual(source)
  })

  it('Math.random が常に 0 だと Fisher–Yates は先頭へ回す並びになる', () => {
    mockRandom([0])
    expect(shuffle([1, 2, 3, 4])).toEqual([2, 3, 4, 1])
  })
})

describe('newBag', () => {
  it('7 種をちょうど 1 個ずつ含む', () => {
    const bag = newBag()
    expect(bag).toHaveLength(7)
    expect([...bag].sort()).toEqual([...TETROMINO_TYPES].sort())
  })
})

describe('7-bag', () => {
  it('最初の 7 個で 7 種が各 1 回ずつ出る', () => {
    const types = drawSequence(initialQueue(), 7)
    expect(countByType(types)).toEqual(countByType(TETROMINO_TYPES))
  })

  it('14 個で各 2 回ずつ出る', () => {
    const types = drawSequence(initialQueue(), 14)
    for (const type of TETROMINO_TYPES) {
      expect(types.filter((t) => t === type)).toHaveLength(2)
    }
  })

  it('7 個ごとの区切りでは必ず 7 種が揃う (bag 境界をまたがない)', () => {
    const types = drawSequence(initialQueue(), 21)
    for (let i = 0; i < 21; i += 7) {
      expect([...types.slice(i, i + 7)].sort()).toEqual([...TETROMINO_TYPES].sort())
    }
  })
})

describe('queue', () => {
  it('initialQueue は QUEUE_SIZE 個の queue と残りの bag を返す', () => {
    const { queue, bag } = initialQueue()
    expect(queue).toHaveLength(QUEUE_SIZE)
    expect(bag).toHaveLength(7 - QUEUE_SIZE)
  })

  it('newGame の queue は QUEUE_SIZE 個ある', () => {
    expect(newGame().queue).toHaveLength(QUEUE_SIZE)
  })

  it('draw を繰り返しても queue は常に QUEUE_SIZE 個を保つ', () => {
    drawSequence(newGame(), 30)
  })
})

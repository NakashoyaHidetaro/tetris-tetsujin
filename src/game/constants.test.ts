import { describe, expect, it } from 'vitest'
import { DROP_MS, MIN_DROP_MS, dropInterval, levelForLines } from './constants'

describe('levelForLines', () => {
  it('10 ラインごとにレベルが 1 上がる (1 始まり)', () => {
    expect(levelForLines(0)).toBe(1)
    expect(levelForLines(9)).toBe(1)
    expect(levelForLines(10)).toBe(2)
    expect(levelForLines(19)).toBe(2)
    expect(levelForLines(100)).toBe(11)
  })
})

describe('dropInterval', () => {
  it('レベル 1 は既定の落下間隔', () => {
    expect(dropInterval(1)).toBe(DROP_MS)
  })

  it('レベルが上がるほど単調に短くなる', () => {
    for (let level = 1; level < 20; level++) {
      expect(dropInterval(level + 1)).toBeLessThanOrEqual(dropInterval(level))
    }
  })

  it('下限 100ms を下回らない', () => {
    expect(dropInterval(9)).toBe(MIN_DROP_MS)
    expect(dropInterval(50)).toBe(MIN_DROP_MS)
  })
})

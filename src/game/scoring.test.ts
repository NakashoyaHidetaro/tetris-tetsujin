import { describe, expect, it } from 'vitest'
import { scoreForClear, scoreForHardDrop, scoreForSoftDrop } from './scoring'

describe('scoreForClear', () => {
  it('1/2/3/4 ライン = 100/300/500/800 (レベル 1)', () => {
    expect(scoreForClear(1, 1)).toBe(100)
    expect(scoreForClear(2, 1)).toBe(300)
    expect(scoreForClear(3, 1)).toBe(500)
    expect(scoreForClear(4, 1)).toBe(800)
  })

  it('レベルを乗算する', () => {
    expect(scoreForClear(1, 5)).toBe(500)
    expect(scoreForClear(4, 3)).toBe(2400)
  })

  it('消去 0 ラインは 0 点', () => {
    expect(scoreForClear(0, 9)).toBe(0)
    expect(scoreForClear(0, 9, true)).toBe(0)
  })

  it('T-スピンは 800/1200/1600 × レベルで、基本ライン表とは加算しない', () => {
    expect(scoreForClear(1, 1, true)).toBe(800)
    expect(scoreForClear(2, 1, true)).toBe(1200)
    expect(scoreForClear(3, 1, true)).toBe(1600)
    expect(scoreForClear(2, 4, true)).toBe(4800)
  })
})

describe('ドロップの加点', () => {
  it('ソフトドロップは 1 セル 1 点、ハードドロップは 1 セル 2 点', () => {
    expect(scoreForSoftDrop(3)).toBe(3)
    expect(scoreForHardDrop(3)).toBe(6)
    expect(scoreForHardDrop(0)).toBe(0)
  })
})

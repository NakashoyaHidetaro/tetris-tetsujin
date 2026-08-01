import { describe, expect, it } from 'vitest'
import { rotateShape } from './piece'

describe('rotateShape', () => {
  it('I ミノ (1x4) を時計回りに 90° 回転すると 4x1 になる', () => {
    expect(rotateShape([[1, 1, 1, 1]])).toEqual([[1], [1], [1], [1]])
  })

  it('J ミノの 90° 回転が正しい', () => {
    expect(
      rotateShape([
        [1, 0, 0],
        [1, 1, 1],
      ]),
    ).toEqual([
      [1, 1],
      [1, 0],
      [1, 0],
    ])
  })

  it('4 回回転すると元の形に戻る', () => {
    const shape = [
      [0, 1, 1],
      [1, 1, 0],
    ]
    expect(rotateShape(rotateShape(rotateShape(rotateShape(shape))))).toEqual(shape)
  })
})

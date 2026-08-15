import { describe, expect, it } from 'vitest'
import { createPiece, rotateShape, shapeFor, trimShape } from './piece'

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

describe('createPiece', () => {
  it('SRS のスポーン位置に置く (JLSTZ は x = 3..5、I は 3..6、O は 4..5)', () => {
    expect(createPiece('T')).toMatchObject({ type: 'T', x: 3, y: 0, rotation: 0 })
    expect(createPiece('I')).toMatchObject({ type: 'I', x: 3, y: 0 })
    expect(createPiece('O')).toMatchObject({ type: 'O', x: 4, y: 0 })
  })
})

describe('shapeFor', () => {
  it('T の 4 状態が SRS どおりになる', () => {
    expect(shapeFor('T', 0)).toEqual([
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ])
    expect(shapeFor('T', 1)).toEqual([
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ])
    expect(shapeFor('T', 2)).toEqual([
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ])
    expect(shapeFor('T', 3)).toEqual([
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ])
  })

  it('I は 4x4 ボックスの中で縦横に切り替わる', () => {
    expect(shapeFor('I', 0)[1]).toEqual([1, 1, 1, 1])
    expect(shapeFor('I', 1).map((row) => row[2])).toEqual([1, 1, 1, 1])
  })

  it('O は回転しても形が変わらない', () => {
    expect(shapeFor('O', 1)).toEqual(shapeFor('O', 0))
  })
})

describe('trimShape', () => {
  it('プレビュー用に空の行・列を落とす', () => {
    expect(trimShape(shapeFor('I', 0))).toEqual([[1, 1, 1, 1]])
    expect(trimShape(shapeFor('T', 0))).toEqual([
      [0, 1, 0],
      [1, 1, 1],
    ])
    expect(trimShape(shapeFor('I', 1))).toEqual([[1], [1], [1], [1]])
  })
})

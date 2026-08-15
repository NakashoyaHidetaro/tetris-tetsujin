import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GESTURE_CONFIG,
  beginGesture,
  endGesture,
  hasGestureHandlers,
  measureCellSize,
  moveGesture,
  type GestureAction,
  type GestureConfig,
  type GesturePoint,
} from './boardGestures'

/**
 * 盤面ジェスチャ判定 (PRD #16) のテスト。
 *
 * ここが守るリグレッション:
 * - ドラッグ量に対する移動マス数がずれる (1 セル動かしたのに 2 マス飛ぶ / 戻しても戻らない)
 * - 斜めのブレで左右移動と落下が同時に出る (軸固定の破綻)
 * - 素早い下フリックとゆっくりした下スワイプの区別が壊れる (意図せぬハードドロップ)
 * - わずかな指ブレでタップ (回転) が発火しなくなる / スワイプ後にも回転が混ざる
 */

const CELL = DEFAULT_GESTURE_CONFIG.cellSize

/** 座標列を順に流し込み、発火した操作を時系列で連結して返す */
const play = (
  points: GesturePoint[],
  { release = true, config = DEFAULT_GESTURE_CONFIG }: { release?: boolean; config?: GestureConfig } = {},
): GestureAction[] => {
  const [first, ...rest] = points
  let state = beginGesture(first)
  const actions: GestureAction[] = []
  let last = first

  for (const point of rest) {
    const result = moveGesture(state, point, config)
    state = result.state
    actions.push(...result.actions)
    last = point
  }
  if (release) actions.push(...endGesture(state, last, config).actions)
  return actions
}

const at = (x: number, y: number, time: number): GesturePoint => ({ x, y, time })

describe('盤面ジェスチャ: 水平スワイプ', () => {
  it('セル幅ぶん動くごとに 1 マスずつ右へ移動する', () => {
    const actions = play([
      at(0, 0, 0),
      at(CELL, 0, 30),
      at(CELL * 2, 0, 60),
      at(CELL * 3, 0, 90),
    ])

    expect(actions).toEqual(['moveRight', 'moveRight', 'moveRight'])
  })

  it('一度に 3 セル動かせば 3 マスまとめて送る (指の速さで取りこぼさない)', () => {
    expect(play([at(0, 0, 0), at(CELL * 3, 0, 40)])).toEqual([
      'moveRight',
      'moveRight',
      'moveRight',
    ])
  })

  it('左へのドラッグは moveLeft になる', () => {
    expect(play([at(0, 0, 0), at(-CELL * 2, 0, 40)])).toEqual(['moveLeft', 'moveLeft'])
  })

  it('指を戻すと移動も戻る (絶対位置に追従し、片道ぶんが累積しない)', () => {
    const actions = play([at(0, 0, 0), at(CELL * 2, 0, 40), at(0, 0, 80)])

    expect(actions).toEqual(['moveRight', 'moveRight', 'moveLeft', 'moveLeft'])
  })

  it('1 セル未満のブレでは移動しない', () => {
    expect(play([at(0, 0, 0), at(CELL * 0.9, 0, 40)])).toEqual([])
  })

  it('横方向へ倒れた後は下へずれても落下操作を出さない (軸固定)', () => {
    const actions = play([at(0, 0, 0), at(CELL * 2, 0, 40), at(CELL * 2, CELL * 3, 400)])

    expect(actions).toEqual(['moveRight', 'moveRight'])
  })
})

describe('盤面ジェスチャ: 下スワイプ', () => {
  it('ゆっくり下へ動かすとセル幅ごとにソフトドロップする', () => {
    const actions = play([at(0, 0, 0), at(0, CELL, 300), at(0, CELL * 2, 600)])

    expect(actions).toEqual(['softDrop', 'softDrop'])
  })

  it('素早く大きく下へ振るとハードドロップになる', () => {
    expect(play([at(0, 0, 0), at(0, CELL * 3, 100)])).toEqual(['hardDrop'])
  })

  it('同じ距離でもゆっくりならハードドロップにならない', () => {
    const actions = play([at(0, 0, 0), at(0, CELL * 3, 800)])

    expect(actions).toEqual(['softDrop', 'softDrop', 'softDrop'])
  })

  it('ハードドロップ後は同じジェスチャ中の追加入力を無視する', () => {
    const actions = play([
      at(0, 0, 0),
      at(0, CELL * 3, 100),
      at(0, CELL * 6, 150),
      at(CELL * 5, CELL * 6, 200),
    ])

    expect(actions).toEqual(['hardDrop'])
  })

  it('上スワイプには操作を割り当てない', () => {
    expect(play([at(0, 0, 0), at(0, -CELL * 3, 100)])).toEqual([])
  })

  it('縦へ倒れた後は横にずれても移動しない (軸固定)', () => {
    const actions = play([at(0, 0, 0), at(0, CELL, 300), at(CELL * 3, CELL, 600)])

    expect(actions).toEqual(['softDrop'])
  })
})

describe('盤面ジェスチャ: タップ', () => {
  it('ほとんど動かさずに離すと回転する', () => {
    expect(play([at(50, 50, 0), at(52, 51, 60), at(50, 50, 90)])).toEqual(['rotate'])
  })

  it('移動を伴ったスワイプの終了では回転しない', () => {
    const actions = play([at(0, 0, 0), at(CELL * 2, 0, 60)])

    expect(actions).toEqual(['moveRight', 'moveRight'])
  })

  it('長押ししてから離してもタップ扱いにしない', () => {
    expect(play([at(50, 50, 0), at(50, 50, 1200)])).toEqual([])
  })

  it('離さずに終わったジェスチャ (キャンセル相当) では回転しない', () => {
    expect(play([at(50, 50, 0), at(51, 50, 40)], { release: false })).toEqual([])
  })
})

describe('盤面ジェスチャ: 補助関数', () => {
  it('セル幅は設定値で変えられる (実測セルサイズに追従する)', () => {
    const config: GestureConfig = { ...DEFAULT_GESTURE_CONFIG, cellSize: 10 }

    expect(play([at(0, 0, 0), at(30, 0, 40)], { config })).toEqual([
      'moveRight',
      'moveRight',
      'moveRight',
    ])
  })

  it('measureCellSize は幅が測れない環境で既定値へフォールバックする', () => {
    expect(measureCellSize(null)).toBe(DEFAULT_GESTURE_CONFIG.cellSize)
    // jsdom はレイアウトしないので幅 0 → 既定値
    expect(measureCellSize(document.createElement('div'))).toBe(DEFAULT_GESTURE_CONFIG.cellSize)
  })

  it('hasGestureHandlers はコールバックが 1 つも無いときだけ false', () => {
    expect(hasGestureHandlers({})).toBe(false)
    expect(hasGestureHandlers({ onRotate: () => {} })).toBe(true)
  })
})

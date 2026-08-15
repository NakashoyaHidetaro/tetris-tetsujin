import { afterEach, describe, expect, it } from 'vitest'
import { loadRanking, saveScore } from './storage'

const KEY = 'tetris-tetsujin.ranking'
const LEGACY_KEY = 'tetris-tetsujin.bestScore'

type Store = Record<string, string>

/**
 * テストは node 環境 (jsdom なし) で走るため localStorage は本来未定義。
 * globalThis に生やして差し替え、後片付けで元の未定義状態へ戻す。
 */
const installStorage = (impl: Partial<Storage>) => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: impl,
    configurable: true,
    writable: true,
  })
}

const fakeStorage = (initial: Store = {}) => {
  const data: Store = { ...initial }
  return {
    data,
    storage: {
      getItem: (k: string) => (k in data ? data[k] : null),
      setItem: (k: string, v: string) => {
        data[k] = v
      },
      removeItem: (k: string) => {
        delete data[k]
      },
    } as unknown as Storage,
  }
}

const at = (n: number) => new Date(Date.UTC(2024, 0, 1, 0, 0, n))

/** score だけ並べた配列にして比較しやすくする */
const scoresOf = (entries: { score: number }[]) => entries.map((e) => e.score)

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('storage (localStorage が使えない環境)', () => {
  it('localStorage 未定義でも loadRanking は空配列を返す', () => {
    expect(typeof localStorage).toBe('undefined')
    expect(loadRanking()).toEqual([])
  })

  it('localStorage 未定義でも saveScore は throw せず結果を返す', () => {
    const result = saveScore(1234, at(0))
    expect(result.rank).toBe(1)
    expect(scoresOf(result.ranking)).toEqual([1234])
  })

  it('localStorage の参照自体が throw しても空配列 / 結果返却になる', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('access denied')
      },
      configurable: true,
    })
    expect(loadRanking()).toEqual([])
    expect(() => saveScore(100, at(0))).not.toThrow()
  })

  it('getItem / setItem が throw しても空配列 / 結果返却になる', () => {
    installStorage({
      getItem: () => {
        throw new Error('boom')
      },
      setItem: () => {
        throw new Error('quota exceeded')
      },
      removeItem: () => {
        throw new Error('nope')
      },
    })
    expect(loadRanking()).toEqual([])
    const result = saveScore(100, at(0))
    expect(result.rank).toBe(1)
    expect(scoresOf(result.ranking)).toEqual([100])
  })
})

describe('loadRanking', () => {
  it('未保存なら空配列を返す', () => {
    installStorage(fakeStorage().storage)
    expect(loadRanking()).toEqual([])
  })

  it('不正な JSON なら空配列を返す', () => {
    installStorage(fakeStorage({ [KEY]: '{{{' }).storage)
    expect(loadRanking()).toEqual([])
  })

  it('配列でない JSON なら空配列を返す', () => {
    installStorage(fakeStorage({ [KEY]: '{"score":100}' }).storage)
    expect(loadRanking()).toEqual([])
  })

  it('不正なエントリだけを捨てて残りを返す', () => {
    const raw = JSON.stringify([
      { score: 100, date: '2024-01-01T00:00:00.000Z' },
      { score: -1, date: '2024-01-01T00:00:00.000Z' }, // 負値
      { score: 'x', date: '2024-01-01T00:00:00.000Z' }, // 数値でない
      { score: 200 }, // date なし
      { score: 300, date: 12345 }, // date が文字列でない
      null,
      'nope',
      { score: 50, date: '2024-01-02T00:00:00.000Z' },
    ])
    installStorage(fakeStorage({ [KEY]: raw }).storage)
    expect(scoresOf(loadRanking())).toEqual([100, 50])
  })

  it('スコア降順にソートし最大10件で返す', () => {
    const raw = JSON.stringify(
      Array.from({ length: 15 }, (_, i) => ({
        score: (i + 1) * 10,
        date: at(i).toISOString(),
      })),
    )
    installStorage(fakeStorage({ [KEY]: raw }).storage)
    expect(scoresOf(loadRanking())).toEqual([150, 140, 130, 120, 110, 100, 90, 80, 70, 60])
  })

  it('小数のスコアは Math.floor される', () => {
    const raw = JSON.stringify([{ score: 123.9, date: at(0).toISOString() }])
    installStorage(fakeStorage({ [KEY]: raw }).storage)
    expect(scoresOf(loadRanking())).toEqual([123])
  })

  it('旧キー tetris-tetsujin.bestScore を削除する', () => {
    const { data, storage } = fakeStorage({ [LEGACY_KEY]: '4200' })
    installStorage(storage)
    expect(loadRanking()).toEqual([])
    expect(LEGACY_KEY in data).toBe(false)
  })
})

describe('saveScore', () => {
  it('保存した内容を読み戻せる', () => {
    const { data, storage } = fakeStorage()
    installStorage(storage)
    const result = saveScore(4200, at(0))
    expect(result.ranking).toEqual([{ score: 4200, date: at(0).toISOString() }])
    expect(JSON.parse(data[KEY])).toEqual(result.ranking)
    expect(loadRanking()).toEqual(result.ranking)
  })

  it('スコア降順に挿入され rank が 1 始まりで返る', () => {
    installStorage(fakeStorage().storage)
    expect(saveScore(100, at(0)).rank).toBe(1)
    expect(saveScore(300, at(1)).rank).toBe(1)
    expect(saveScore(200, at(2)).rank).toBe(2)
    const last = saveScore(50, at(3))
    expect(last.rank).toBe(4)
    expect(scoresOf(last.ranking)).toEqual([300, 200, 100, 50])
  })

  it('同点の場合は既存エントリが上位になる', () => {
    installStorage(fakeStorage().storage)
    saveScore(100, at(0))
    const result = saveScore(100, at(1))
    expect(result.rank).toBe(2)
    expect(result.ranking.map((e) => e.date)).toEqual([at(0).toISOString(), at(1).toISOString()])
  })

  it('10件を超えたら切り詰められる', () => {
    installStorage(fakeStorage().storage)
    for (let i = 0; i < 10; i += 1) saveScore((i + 1) * 100, at(i))
    const result = saveScore(550, at(10))
    expect(result.rank).toBe(6)
    expect(scoresOf(result.ranking)).toEqual([1000, 900, 800, 700, 600, 550, 500, 400, 300, 200])
    expect(result.ranking).toHaveLength(10)
  })

  it('11位相当のスコアなら rank は null で、ランキングは変わらない', () => {
    installStorage(fakeStorage().storage)
    for (let i = 0; i < 10; i += 1) saveScore((i + 1) * 100, at(i))
    const before = loadRanking()
    const result = saveScore(50, at(10))
    expect(result.rank).toBeNull()
    expect(result.ranking).toEqual(before)
    expect(loadRanking()).toEqual(before)
  })

  it('満杯で最下位と同点なら圏外 (rank は null)', () => {
    installStorage(fakeStorage().storage)
    for (let i = 0; i < 10; i += 1) saveScore((i + 1) * 100, at(i))
    expect(saveScore(100, at(10)).rank).toBeNull()
  })

  it('スコアは Math.floor される', () => {
    installStorage(fakeStorage().storage)
    expect(scoresOf(saveScore(99.9, at(0)).ranking)).toEqual([99])
  })

  it('date 省略時は現在時刻の ISO 文字列が入る', () => {
    installStorage(fakeStorage().storage)
    const [entry] = saveScore(10).ranking
    expect(entry.date).toBe(new Date(entry.date).toISOString())
  })
})

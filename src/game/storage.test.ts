import { afterEach, describe, expect, it } from 'vitest'
import { loadBest, saveBest } from './storage'

const KEY = 'tetris-tetsujin.bestScore'

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
    } as unknown as Storage,
  }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

describe('storage (localStorage が使えない環境)', () => {
  it('localStorage 未定義でも loadBest は 0 を返す', () => {
    expect(typeof localStorage).toBe('undefined')
    expect(loadBest()).toBe(0)
  })

  it('localStorage 未定義でも saveBest は throw しない', () => {
    expect(() => saveBest(1234)).not.toThrow()
  })

  it('localStorage の参照自体が throw しても 0 / no-op になる', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('access denied')
      },
      configurable: true,
    })
    expect(loadBest()).toBe(0)
    expect(() => saveBest(100)).not.toThrow()
  })

  it('getItem / setItem が throw しても 0 / no-op になる', () => {
    installStorage({
      getItem: () => {
        throw new Error('boom')
      },
      setItem: () => {
        throw new Error('quota exceeded')
      },
    })
    expect(loadBest()).toBe(0)
    expect(() => saveBest(100)).not.toThrow()
  })
})

describe('storage (localStorage が使える環境)', () => {
  it('保存した値を読み戻せる', () => {
    const { data, storage } = fakeStorage()
    installStorage(storage)
    saveBest(4200)
    expect(data[KEY]).toBe('4200')
    expect(loadBest()).toBe(4200)
  })

  it('未保存なら 0 を返す', () => {
    installStorage(fakeStorage().storage)
    expect(loadBest()).toBe(0)
  })

  it('数値でない値や負値が入っていても 0 を返す', () => {
    installStorage(fakeStorage({ [KEY]: 'not-a-number' }).storage)
    expect(loadBest()).toBe(0)
    installStorage(fakeStorage({ [KEY]: '-1' }).storage)
    expect(loadBest()).toBe(0)
  })

  it('同じ値を繰り返し保存しても結果が変わらない (冪等)', () => {
    const { data, storage } = fakeStorage()
    installStorage(storage)
    saveBest(500)
    saveBest(500)
    expect(data[KEY]).toBe('500')
    expect(loadBest()).toBe(500)
  })

  it('NaN は保存しない', () => {
    const { data, storage } = fakeStorage()
    installStorage(storage)
    saveBest(Number.NaN)
    expect(KEY in data).toBe(false)
  })
})

/**
 * 効果音のミュート設定 (PRD #8: ミュートトグルを設け localStorage に保存する)。
 *
 * SoundManager (発音側) と MuteToggle (UI 側) を直接繋がずに済むよう、
 * ごく小さな購読可能ストアにしてある。App.tsx に状態を持たせる必要がない。
 */

const MUTED_KEY = 'tetris-tetsujin.muted'

// localStorage は未定義 (テスト環境) や参照自体が throw する環境があるため包む
const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export const loadMuted = (): boolean => {
  try {
    // 既定は音あり (PRD に既定の指定はないため、機能が体験できる側を初期値にする)
    return getStorage()?.getItem(MUTED_KEY) === 'on'
  } catch {
    return false
  }
}

const persist = (muted: boolean): void => {
  try {
    getStorage()?.setItem(MUTED_KEY, muted ? 'on' : 'off')
  } catch {
    // 保存できなくても再生自体は動くので握りつぶす
  }
}

let muted = loadMuted()
const listeners = new Set<(muted: boolean) => void>()

export const isMuted = (): boolean => muted

export const setMuted = (next: boolean): void => {
  if (muted === next) return
  muted = next
  persist(next)
  listeners.forEach((listener) => listener(next))
}

export const toggleMuted = (): boolean => {
  setMuted(!muted)
  return muted
}

/** 変更購読。戻り値を呼ぶと解除される */
export const subscribeMuted = (listener: (muted: boolean) => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** テスト用: 保存値から状態を読み直す */
export const resetMutedForTest = (): void => {
  muted = loadMuted()
  listeners.forEach((listener) => listener(muted))
}

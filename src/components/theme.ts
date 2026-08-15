/**
 * 表示設定 (PRD #9 テーマ切替 / #17 色覚多様性対応)。
 *
 * 色は CSS カスタムプロパティに集約し、ここでは <html> の data 属性を
 * 付け替えるだけにする。こうすると App.tsx / useTetris に手を入れずに
 * 全コンポーネントの配色を切り替えられる。
 *
 * このモジュールは import された時点で保存済み設定を適用する (副作用)。
 * ThemeToggle が import されるので、React の初回描画前に属性が付く。
 */

export type Theme = 'dark' | 'light'
export type Palette = 'classic' | 'cud'

export interface Display {
  theme: Theme
  /** ミノの配色。cud = 色覚多様性を考慮したパレット (Okabe-Ito ベース) */
  palette: Palette
  /** ミノ種別を色以外 (記号) でも区別する表示 */
  symbols: boolean
}

const THEME_KEY = 'tetris-tetsujin.theme'
const PALETTE_KEY = 'tetris-tetsujin.palette'
const SYMBOLS_KEY = 'tetris-tetsujin.minoSymbols'

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'ダーク' },
  { value: 'light', label: 'ライト' },
]

export const PALETTES: { value: Palette; label: string }[] = [
  { value: 'classic', label: '標準' },
  { value: 'cud', label: '色覚多様性対応' },
]

// localStorage は未定義 (テスト環境) や参照自体が throw する環境があるため包む
const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

const read = (key: string): string | null => {
  try {
    return getStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

const write = (key: string, value: string): void => {
  try {
    getStorage()?.setItem(key, value)
  } catch {
    // 保存できなくても表示自体は動くので握りつぶす
  }
}

/** OS/ブラウザの配色設定。未保存時の初期テーマに使う */
const prefersDark = (): boolean => {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return true
  }
}

export const loadDisplay = (): Display => {
  const theme = read(THEME_KEY)
  const palette = read(PALETTE_KEY)
  return {
    theme: theme === 'dark' || theme === 'light' ? theme : prefersDark() ? 'dark' : 'light',
    palette: palette === 'cud' ? 'cud' : 'classic',
    symbols: read(SYMBOLS_KEY) === 'on',
  }
}

/** <html> に属性を付けるだけ。CSS 側 (index.css) が実際の色を差し替える */
export const applyDisplay = (display: Display): void => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = display.theme
  root.dataset.palette = display.palette
  root.dataset.minoSymbols = display.symbols ? 'on' : 'off'
}

export const saveDisplay = (display: Display): void => {
  write(THEME_KEY, display.theme)
  write(PALETTE_KEY, display.palette)
  write(SYMBOLS_KEY, display.symbols ? 'on' : 'off')
}

/** 保存済み設定を読み出して即適用する。モジュール読み込み時にも自動で走る */
export const initDisplay = (): Display => {
  const display = loadDisplay()
  applyDisplay(display)
  return display
}

initDisplay()

import { DEFAULT_KEYMAP, normalizeKeymap, type InputAction, type KeyMap } from './keymap'

/**
 * 入力設定 (PRD #14 キーコンフィグ / #15 DAS/ARR) の保存と共有。
 *
 * 設定はキーボード入力 (useTetris)・タッチ操作 (TouchControls)・ヘルプ表示
 * (HelpBar)・設定 UI の 4 か所から参照されるため、モジュールレベルの小さな
 * ストア (getSnapshot / subscribe) にして useSyncExternalStore で配る。
 * React には依存しないので logic テストで検証できる。
 */

export const KEYMAP_STORAGE_KEY = 'tetris-tetsujin.keymap'
export const INPUT_SETTINGS_STORAGE_KEY = 'tetris-tetsujin.inputSettings'

/** DAS (初回遅延) の既定値 (ms)。PRD #15 */
export const DEFAULT_DAS_MS = 170
/** ARR (連続間隔) の既定値 (ms)。PRD #15 */
export const DEFAULT_ARR_MS = 50

export const DAS_MIN_MS = 0
export const DAS_MAX_MS = 500
export const DAS_STEP_MS = 10
/** ARR は 0 にすると 1 フレーム未満の連射で操作不能になるため下限を設ける */
export const ARR_MIN_MS = 10
export const ARR_MAX_MS = 200
export const ARR_STEP_MS = 5

export interface InputConfig {
  keymap: KeyMap
  /** 横移動・ソフトドロップの長押しがリピートを始めるまでの遅延 (ms) */
  das: number
  /** リピート中の入力間隔 (ms) */
  arr: number
}

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  keymap: DEFAULT_KEYMAP,
  das: DEFAULT_DAS_MS,
  arr: DEFAULT_ARR_MS,
}

const clampStep = (value: unknown, min: number, max: number, step: number, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const clamped = Math.min(max, Math.max(min, value))
  return Math.round(clamped / step) * step
}

export const normalizeDas = (value: unknown): number =>
  clampStep(value, DAS_MIN_MS, DAS_MAX_MS, DAS_STEP_MS, DEFAULT_DAS_MS)

export const normalizeArr = (value: unknown): number =>
  clampStep(value, ARR_MIN_MS, ARR_MAX_MS, ARR_STEP_MS, DEFAULT_ARR_MS)

/** 保存値・外部入力から正しい InputConfig を組み立てる */
export const normalizeInputConfig = (raw: unknown): InputConfig => {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    keymap: normalizeKeymap(source.keymap),
    das: normalizeDas(source.das),
    arr: normalizeArr(source.arr),
  }
}

// localStorage は未定義 (node/テスト環境) や参照自体が throw する環境があるため包む
const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

const readJson = (key: string): unknown => {
  try {
    const raw = getStorage()?.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const writeJson = (key: string, value: unknown): void => {
  try {
    getStorage()?.setItem(key, JSON.stringify(value))
  } catch {
    // 保存できなくてもゲーム自体は動く (PRD #5 と同じ方針)
  }
}

/** 保存済みの入力設定を読み出す。未保存・不正値なら既定値 */
export const loadInputConfig = (): InputConfig => {
  const settings = readJson(INPUT_SETTINGS_STORAGE_KEY)
  const source = (typeof settings === 'object' && settings !== null ? settings : {}) as Record<
    string,
    unknown
  >
  return normalizeInputConfig({
    keymap: readJson(KEYMAP_STORAGE_KEY),
    das: source.das,
    arr: source.arr,
  })
}

/** キーマップと DAS/ARR を別キーで保存する (キーマップは単体で読めるほうが扱いやすい) */
export const saveInputConfig = (config: InputConfig): void => {
  writeJson(KEYMAP_STORAGE_KEY, config.keymap)
  writeJson(INPUT_SETTINGS_STORAGE_KEY, { das: config.das, arr: config.arr })
}

// --- ストア ---------------------------------------------------------------

let current: InputConfig = loadInputConfig()
const listeners = new Set<() => void>()

export const getInputConfig = (): InputConfig => current

export const subscribeInputConfig = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const commit = (next: InputConfig): void => {
  current = next
  saveInputConfig(next)
  for (const listener of [...listeners]) listener()
}

export const setInputConfig = (patch: Partial<InputConfig>): void => {
  commit(normalizeInputConfig({ ...current, ...patch }))
}

export const setKeymap = (keymap: KeyMap): void => {
  commit({ ...current, keymap: normalizeKeymap(keymap) })
}

export const resetInputConfig = (): void => {
  commit(normalizeInputConfig(DEFAULT_INPUT_CONFIG))
}

/** テスト用: 保存を読み直してストアを作り直す */
export const reloadInputConfig = (): InputConfig => {
  current = loadInputConfig()
  for (const listener of [...listeners]) listener()
  return current
}

export type { InputAction, KeyMap }

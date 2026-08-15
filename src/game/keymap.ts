/**
 * キーコンフィグ (PRD #14)。
 *
 * 設計上の要点:
 * - キーの識別には KeyboardEvent.code (物理キー) を使う。`key` は Shift や
 *   レイアウトで値が変わるため、割り当ての保存・照合には向かない
 * - 1 操作に複数キーを割り当てられる (既定の「↑ と X で右回転」を保つため)。
 *   設定 UI からの割り当ては 1 キー置き換え、リセットで既定の複数キーへ戻る
 * - 同じキーが 2 つの操作に載らないよう、割り当て時に重複を検出する
 *
 * React にも DOM にも依存しない純粋モジュールなので logic テストで検証する。
 */

export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'rotateCw'
  | 'rotateCcw'
  | 'softDrop'
  | 'hardDrop'
  | 'hold'
  | 'pause'

/** 操作 → 割り当てキー (KeyboardEvent.code) の配列 */
export type KeyMap = Record<InputAction, string[]>

/** 設定 UI の並び順と表示名。この配列が「全操作」の定義でもある */
export const INPUT_ACTIONS: { action: InputAction; label: string }[] = [
  { action: 'moveLeft', label: '左に移動' },
  { action: 'moveRight', label: '右に移動' },
  { action: 'rotateCw', label: '右回転' },
  { action: 'rotateCcw', label: '左回転' },
  { action: 'softDrop', label: 'ソフトドロップ' },
  { action: 'hardDrop', label: 'ハードドロップ' },
  { action: 'hold', label: 'ホールド' },
  { action: 'pause', label: 'ポーズ' },
]

export const DEFAULT_KEYMAP: KeyMap = {
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  rotateCw: ['ArrowUp', 'KeyX'],
  rotateCcw: ['KeyZ'],
  softDrop: ['ArrowDown'],
  hardDrop: ['Space'],
  hold: ['KeyC', 'ShiftLeft', 'ShiftRight'],
  pause: ['KeyP', 'Escape'],
}

const ACTION_LIST = INPUT_ACTIONS.map(({ action }) => action)

/** 割り当てに使えないキー (ブラウザ操作やフォーカス移動を奪うと復帰できなくなる) */
const FORBIDDEN_CODES = new Set(['Tab', 'F5', 'F11', 'F12', 'ContextMenu'])

export const isAssignableCode = (code: string): boolean =>
  code.length > 0 && !FORBIDDEN_CODES.has(code)

/** 表示用のラベル。特殊キーは記号・略称に、KeyX / Digit1 等は文字だけにする */
export const keyLabel = (code: string): string => {
  const special: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'Space',
    Escape: 'Esc',
    ShiftLeft: 'Shift(左)',
    ShiftRight: 'Shift(右)',
    ControlLeft: 'Ctrl(左)',
    ControlRight: 'Ctrl(右)',
    AltLeft: 'Alt(左)',
    AltRight: 'Alt(右)',
    Enter: 'Enter',
    NumpadEnter: 'Enter(テンキー)',
    Backspace: 'BS',
  }
  if (special[code]) return special[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^Numpad[0-9]$/.test(code)) return `テンキー${code.slice(6)}`
  return code
}

/** 操作に割り当てられたキー列を「↑ / X」のような表示文字列にする */
export const keysLabel = (codes: readonly string[]): string =>
  codes.map(keyLabel).join(' / ')

/**
 * 保存値・外部入力を正しい KeyMap へ整える。
 * - 未知の操作・非文字列・使用不可コードは捨てる
 * - 同一操作内の重複は除く
 * - 先に現れた操作が優先されるよう、他操作と重複するキーは後勝ちにしない
 * - 空になった操作は既定値で埋める (どの操作も必ず 1 つ以上キーを持つ)
 */
export const normalizeKeymap = (raw: unknown): KeyMap => {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const result = {} as KeyMap
  const used = new Set<string>()

  for (const action of ACTION_LIST) {
    const value = source[action]
    const codes: string[] = []
    if (Array.isArray(value)) {
      for (const code of value) {
        if (typeof code !== 'string' || !isAssignableCode(code)) continue
        if (used.has(code) || codes.includes(code)) continue
        codes.push(code)
      }
    } else if (typeof value === 'string' && isAssignableCode(value)) {
      codes.push(value)
    }
    result[action] = codes
    for (const code of codes) used.add(code)
  }

  // 空の操作は既定値で補う (既に他操作が使っているキーは避ける)
  for (const action of ACTION_LIST) {
    if (result[action].length > 0) continue
    const fallback = DEFAULT_KEYMAP[action].filter((code) => !used.has(code))
    result[action] = fallback.length > 0 ? fallback : [...DEFAULT_KEYMAP[action]]
    for (const code of result[action]) used.add(code)
  }

  return result
}

/** そのキーを既に使っている操作を返す (自分自身は除く)。無ければ null */
export const findConflict = (
  keymap: KeyMap,
  code: string,
  self: InputAction,
): InputAction | null => {
  for (const action of ACTION_LIST) {
    if (action === self) continue
    if (keymap[action].includes(code)) return action
  }
  return null
}

export interface AssignResult {
  keymap: KeyMap
  /** 重複のため割り当てを拒否した場合、その相手の操作 */
  conflict: InputAction | null
}

/**
 * 操作へキーを割り当てる (既存の割り当ては置き換える)。
 * 他の操作と重複する場合は割り当てず、conflict にその操作を返す
 */
export const assignKey = (keymap: KeyMap, action: InputAction, code: string): AssignResult => {
  if (!isAssignableCode(code)) return { keymap, conflict: null }
  const conflict = findConflict(keymap, code, action)
  if (conflict) return { keymap, conflict }
  return { keymap: { ...keymap, [action]: [code] }, conflict: null }
}

/** 押されたキーに対応する操作を返す。割り当てが無ければ null */
export const resolveAction = (keymap: KeyMap, code: string): InputAction | null => {
  for (const action of ACTION_LIST) {
    if (keymap[action].includes(code)) return action
  }
  return null
}

/** 操作の表示名 */
export const actionLabel = (action: InputAction): string =>
  INPUT_ACTIONS.find((item) => item.action === action)?.label ?? action

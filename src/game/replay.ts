import { gameReducer } from './reducer'
import { normalizeSeed } from './rng'
import { newGame } from './transitions'
import type { GameAction, GameState, RotationDir } from './types'

/**
 * リプレイ (PRD #18)。
 *
 * 決定論性の担保:
 * 1. ミノ出現は seed 付き PRNG (rng.ts) に置き換え済みで、GameState.initialSeed
 *    から出現列を完全に再現できる
 * 2. gameReducer は純関数なので、同じ初期状態に同じ action 列を同じ順で流せば
 *    必ず同じ状態列になる
 * 3. そこで「reducer へ渡した全 action」を記録する。重力の tick とロックディレイ
 *    満了の lock も含めて記録するため、再生時のタイマー精度・端末性能・ポーズの
 *    有無に一切影響されない (時刻は再生ペースの目安としてしか使わない)
 *
 * つまりリプレイの実体は「シード + 全状態遷移 action 列」であり、PRD が挙げる
 * 2 案のうち安全側 (自動落下 tick を含む全 action 列) を採っている。
 */

export const REPLAY_STORAGE_KEY = 'tetris-tetsujin.replay'
/** 保存形式のバージョン。互換性が壊れる変更をしたら上げる (旧データは破棄する) */
export const REPLAY_VERSION = 1
/** 1 プレイあたりの記録上限。localStorage を溢れさせないための保険 */
export const REPLAY_MAX_EVENTS = 30000
/**
 * 再生時に詰める「無操作の間」の上限 (ms)。
 * ポーズ中の空白等をそのまま待つと再生が止まって見えるため頭打ちにする。
 * action の順序は変えないので決定論性には影響しない
 */
export const PLAYBACK_MAX_GAP_MS = 1200

export interface ReplayEvent {
  /** ゲーム開始からの経過時間 (ms)。再生ペースの目安 */
  t: number
  action: GameAction
}

export interface Replay {
  version: number
  /** newGame に渡すシード */
  seed: number
  events: ReplayEvent[]
  /** 記録終了時のスコア等 (一覧表示用) */
  score: number
  lines: number
  level: number
  /** 記録の総時間 (ms) */
  duration: number
  /** ISO 8601 */
  date: string
}

export interface Recorder {
  seed: number
  startedAt: number
  events: ReplayEvent[]
  /** 上限に達して記録を打ち切ったか */
  overflow: boolean
}

export const createRecorder = (seed: number, startedAt: number): Recorder => ({
  seed,
  startedAt,
  events: [],
  overflow: false,
})

/** reducer へ渡す action をそのまま記録する (restart は新しい記録の開始なので対象外) */
export const recordEvent = (recorder: Recorder, action: GameAction, now: number): void => {
  if (action.type === 'restart') return
  if (recorder.events.length >= REPLAY_MAX_EVENTS) {
    recorder.overflow = true
    return
  }
  recorder.events.push({ t: Math.max(0, Math.round(now - recorder.startedAt)), action })
}

export const finishRecording = (
  recorder: Recorder,
  state: Pick<GameState, 'score' | 'lines' | 'level'>,
  now: number,
): Replay => ({
  version: REPLAY_VERSION,
  seed: recorder.seed,
  events: recorder.events,
  score: state.score,
  lines: state.lines,
  level: state.level,
  duration: Math.max(0, Math.round(now - recorder.startedAt)),
  date: new Date().toISOString(),
})

// --- 検証 -----------------------------------------------------------------

const ROTATION_DIRS = new Set<string>(['cw', 'ccw'])

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** 保存データ由来の action を GameAction へ検証つきで変換する (未知は null) */
export const parseAction = (raw: unknown): GameAction | null => {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>
  switch (value.type) {
    case 'tick':
      return { type: 'tick' }
    case 'softDrop':
      return { type: 'softDrop' }
    case 'hold':
      return { type: 'hold' }
    case 'togglePause':
      return { type: 'togglePause' }
    case 'move':
      return value.dx === 1 || value.dx === -1 ? { type: 'move', dx: value.dx } : null
    case 'rotate': {
      const dir = value.dir
      if (dir === undefined) return { type: 'rotate' }
      return typeof dir === 'string' && ROTATION_DIRS.has(dir)
        ? { type: 'rotate', dir: dir as RotationDir }
        : null
    }
    case 'hardDrop':
      return isFiniteNumber(value.pieceId) ? { type: 'hardDrop', pieceId: value.pieceId } : null
    case 'lock':
      return isFiniteNumber(value.pieceId) ? { type: 'lock', pieceId: value.pieceId } : null
    default:
      // restart は記録対象外。未知の action も落とす
      return null
  }
}

/**
 * 保存値を Replay へ正規化する。
 * バージョン不一致・シード不正・イベントが 1 件も復元できない場合は null
 */
export const normalizeReplay = (raw: unknown): Replay | null => {
  if (typeof raw !== 'object' || raw === null) return null
  const value = raw as Record<string, unknown>
  if (value.version !== REPLAY_VERSION) return null
  const seed = normalizeSeed(value.seed)
  if (seed === null) return null
  if (!Array.isArray(value.events)) return null

  const events: ReplayEvent[] = []
  let last = 0
  for (const item of value.events) {
    if (typeof item !== 'object' || item === null) continue
    const entry = item as Record<string, unknown>
    const action = parseAction(entry.action)
    if (!action) continue
    // 時刻は単調増加に整える (再生ループが後退しないようにするため)
    const t = isFiniteNumber(entry.t) ? Math.max(last, Math.round(entry.t)) : last
    last = t
    events.push({ t, action })
    if (events.length >= REPLAY_MAX_EVENTS) break
  }
  if (events.length === 0) return null

  return {
    version: REPLAY_VERSION,
    seed,
    events,
    score: isFiniteNumber(value.score) ? value.score : 0,
    lines: isFiniteNumber(value.lines) ? value.lines : 0,
    level: isFiniteNumber(value.level) ? value.level : 1,
    duration: isFiniteNumber(value.duration) ? value.duration : last,
    date: typeof value.date === 'string' ? value.date : new Date(0).toISOString(),
  }
}

// --- 再生 -----------------------------------------------------------------

/** リプレイの開始状態 */
export const replayInitialState = (replay: Replay): GameState => newGame(replay.seed)

/** 先頭から count 件の action を適用した状態を返す (純関数。テストと再生の両方で使う) */
export const replayStateAt = (replay: Replay, count: number): GameState => {
  let state = replayInitialState(replay)
  const end = Math.min(count, replay.events.length)
  for (let i = 0; i < end; i++) state = gameReducer(state, replay.events[i].action)
  return state
}

/** 全 action を適用した最終状態 */
export const replayFinalState = (replay: Replay): GameState =>
  replayStateAt(replay, replay.events.length)

// --- 永続化 ---------------------------------------------------------------

const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

/** 直近 1 プレイぶんのリプレイを読み出す。無ければ null */
export const loadReplay = (): Replay | null => {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(REPLAY_STORAGE_KEY)
    if (!raw) return null
    return normalizeReplay(JSON.parse(raw))
  } catch {
    return null
  }
}

/** 直近 1 プレイぶんを保存する (保存は上書き。失敗しても進行に影響させない) */
export const saveReplay = (replay: Replay): void => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replay))
  } catch {
    // 容量超過等。保存できなくてもゲームは続行できる
  }
}

export const clearReplay = (): void => {
  try {
    getStorage()?.removeItem(REPLAY_STORAGE_KEY)
  } catch {
    // 失敗は無視してよい
  }
}

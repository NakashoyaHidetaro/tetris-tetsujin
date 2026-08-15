import { dropY } from '../../game/board'
import type { Board, Piece } from '../../game/types'

/**
 * 効果音イベントの検出 (PRD #8)。
 *
 * useTetris / reducer には一切手を入れず、GameState の「前回値との差分」だけから
 * 発音イベントを導出する。ゲームロジック側に発音の責務を持ち込まないため、
 * ここは副作用のない純関数として切り出してテスト可能にしてある。
 */

export type SoundEvent =
  | 'move'
  | 'rotate'
  | 'lock'
  | 'hardDrop'
  | 'clearSingle'
  | 'clearDouble'
  | 'clearTriple'
  | 'tetris'
  | 'levelUp'
  | 'gameOver'
  | 'pause'
  | 'resume'
  | 'restart'

/**
 * 検出に必要な GameState の部分集合。
 * 他機能 (hold / 消去演出など) でフィールドが増えても影響を受けないよう、
 * 構造的部分型として最小限だけを要求する。
 */
export interface SoundSnapshot {
  board: Board
  /** ゲームオーバー演出などで null になる可能性を許容する */
  piece: Piece | null
  pieceId: number
  lines: number
  level: number
  over: boolean
  paused: boolean
}

/** GameState (の上位互換) からスナップショットを切り出す */
export const toSoundSnapshot = (state: SoundSnapshot): SoundSnapshot => ({
  board: state.board,
  piece: state.piece,
  pieceId: state.pieceId,
  lines: state.lines,
  level: state.level,
  over: state.over,
  paused: state.paused,
})

const CLEAR_EVENTS: SoundEvent[] = ['clearSingle', 'clearDouble', 'clearTriple', 'tetris']

/** 形状が同じか (回転判定用)。回転は必ず新しい配列を作るが、値で比較しておく */
const sameShape = (a: number[][], b: number[][]): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((row, y) => {
    const other = b[y]
    return row.length === other.length && row.every((v, x) => v === other[x])
  })
}

/**
 * ミノがロックされた瞬間に「ハードドロップだったか」を判定する。
 *
 * 自然落下 / ソフトドロップでのロックは「もう 1 マスも下がれない位置」で起きるため
 * 落下可能距離が 0 になる。一方ハードドロップは宙に浮いた位置から一気に確定するので
 * 距離が 1 以上残る。この違いだけでアクションの種別を復元できる。
 */
const wasHardDrop = (prev: SoundSnapshot): boolean => {
  if (!prev.piece) return false
  try {
    return dropY(prev.board, prev.piece) - prev.piece.y > 0
  } catch {
    return false
  }
}

/**
 * 前回と今回の状態から発音すべきイベント列を返す。
 * prev が null (初回描画) のときは何も鳴らさない。
 */
export const detectSoundEvents = (
  prev: SoundSnapshot | null,
  next: SoundSnapshot,
): SoundEvent[] => {
  if (!prev) return []

  // リスタート: over が解除された / カウンタが巻き戻った場合。
  // 新ゲームの初期化差分を「移動」「消去」などと誤検出しないよう最優先で打ち切る
  const restarted =
    (prev.over && !next.over) || next.pieceId < prev.pieceId || next.lines < prev.lines
  if (restarted) return ['restart']

  const events: SoundEvent[] = []
  const landed = next.pieceId > prev.pieceId

  // 同一ミノが動いた場合のみ移動/回転を鳴らす。
  // 回転はキックで x も動きうるので、形状変化を優先して 1 イベントに集約する
  if (!landed && prev.piece && next.piece) {
    if (!sameShape(prev.piece.shape, next.piece.shape)) {
      events.push('rotate')
    } else if (prev.piece.x !== next.piece.x) {
      events.push('move')
    }
    // y の変化 (自然落下 / ソフトドロップ) は鳴らさない: 落下のたびに鳴って煩いため
  }

  if (landed) {
    events.push(wasHardDrop(prev) ? 'hardDrop' : 'lock')
  }

  const cleared = next.lines - prev.lines
  if (cleared > 0) {
    events.push(CLEAR_EVENTS[Math.min(cleared, CLEAR_EVENTS.length) - 1])
  }

  if (next.level > prev.level) events.push('levelUp')
  if (!prev.over && next.over) events.push('gameOver')
  if (prev.paused !== next.paused) events.push(next.paused ? 'pause' : 'resume')

  return events
}

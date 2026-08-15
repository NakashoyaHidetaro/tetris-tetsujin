export const COLS = 10
export const ROWS = 20

/** レベル 1 の自動落下間隔 (ms) */
export const DROP_MS = 500
/** レベルごとに短縮する量 (ms) */
export const DROP_STEP_MS = 50
/** 自動落下間隔の下限 (ms) */
export const MIN_DROP_MS = 100
/** 1 レベル上がるのに必要な消去ライン数 */
export const LINES_PER_LEVEL = 10

/**
 * ロックディレイ (PRD #12)。接地してからこの時間は移動・回転を受け付け、固定しない。
 * 実際の経過時間の計測は useTetris (setTimeout) が担い、ゲームロジック層は
 * 「タイマーを張り直すか (lockKey)」「再始動の上限に達したか (lockResets)」を管理する
 */
export const LOCK_DELAY_MS = 500

/** 接地中の移動・回転によるロックディレイ再始動の上限回数 (無限ロック回避) */
export const LOCK_RESET_LIMIT = 15

/**
 * 累計消去ライン数からレベルを求める (PRD #3: floor(lines / 10) + 1)
 */
export const levelForLines = (lines: number): number =>
  Math.floor(lines / LINES_PER_LEVEL) + 1

/**
 * レベルに対応する自動落下間隔 (PRD #3: max(100, 500 - (level - 1) * 50) ms)。
 * 単調減少かつ下限 100ms
 */
export const dropInterval = (level: number): number =>
  Math.max(MIN_DROP_MS, DROP_MS - (level - 1) * DROP_STEP_MS)

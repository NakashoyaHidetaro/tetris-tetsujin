/**
 * スコア表 (PRD #13)。ガイドライン準拠の固定表 × レベル。
 * レベルは「その消去によるライン加算・レベル更新を行う前」の値を渡すこと
 */

/** 通常のライン消去: index = 消去ライン数 */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const

/** T-スピン (Mini を除く) のライン消去: index = 消去ライン数 */
export const TSPIN_SCORES = [0, 800, 1200, 1600] as const

/** ソフトドロップ 1 セルあたりの加点 */
export const SOFT_DROP_POINT = 1

/** ハードドロップ 1 セルあたりの加点 */
export const HARD_DROP_POINT = 2

/**
 * ライン消去の得点。T-スピンと判定された消去には T-スピン表**のみ**を適用する
 * (基本ライン表とは加算しない)
 */
export const scoreForClear = (cleared: number, level: number, tspin = false): number => {
  const table = tspin ? TSPIN_SCORES : LINE_SCORES
  const base = table[cleared] ?? 0
  return base * level
}

/** ソフトドロップの落下セル数ぶんの得点 */
export const scoreForSoftDrop = (cells: number): number => cells * SOFT_DROP_POINT

/** ハードドロップの落下セル数ぶんの得点 */
export const scoreForHardDrop = (cells: number): number => cells * HARD_DROP_POINT

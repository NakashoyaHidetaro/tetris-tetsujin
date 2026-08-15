/**
 * シード付き擬似乱数 (PRD #18 リプレイ)。
 *
 * リプレイの決定論性はここが土台になる。ポイントは「乱数器を状態として持ち回る」
 * こと: クロージャではなく 32bit 整数 1 個 (= state) で表現するので、GameState に
 * そのまま載せられ、JSON へ保存でき、テストでも比較できる。
 *
 * アルゴリズムは mulberry32 (32bit 状態の高速 PRNG)。暗号用途ではないが、
 * ミノの出現順を再現するには十分な品質と周期を持つ。
 */

export interface RandomResult {
  /** [0, 1) の乱数 */
  value: number
  /** 次の呼び出しに渡す状態 */
  state: number
}

/** 乱数を 1 つ進める。同じ state からは常に同じ結果になる (純関数) */
export const nextRandom = (state: number): RandomResult => {
  const a = (state + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a }
}

/** [0, max) の整数を返す (max は 1 以上) */
export const nextInt = (state: number, max: number): RandomResult => {
  const next = nextRandom(state)
  return { value: Math.floor(next.value * max), state: next.state }
}

/** 新規ゲーム用のシードを作る。ここだけが Math.random に依存する */
export const randomSeed = (): number => Math.floor(Math.random() * 0x100000000) >>> 0

/** 保存済みリプレイ等から読み込んだシードを 32bit 符号なし整数へ正規化する */
export const normalizeSeed = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.floor(value) >>> 0
}

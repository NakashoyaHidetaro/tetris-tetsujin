const BEST_SCORE_KEY = 'tetris-tetsujin.bestScore'

// localStorage は「未定義 (node/SSR/テスト環境)」だけでなく「プロパティ参照自体が
// throw する (Cookie 無効時の一部ブラウザ)」ケースもあるため、参照ごと try で包む
const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

/** 保存済みベストスコアを返す。未保存・不正値・利用不可なら 0 */
export const loadBest = (): number => {
  const storage = getStorage()
  if (!storage) return 0
  try {
    const raw = storage.getItem(BEST_SCORE_KEY)
    if (raw === null) return 0
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) return 0
    return Math.floor(value)
  } catch {
    return 0
  }
}

/** ベストスコアを保存する。利用不可な環境では何もしない (冪等) */
export const saveBest = (score: number): void => {
  if (!Number.isFinite(score)) return
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(BEST_SCORE_KEY, String(Math.floor(score)))
  } catch {
    // 保存失敗 (QuotaExceeded / プライベートモード等) はゲーム進行に影響させない
  }
}

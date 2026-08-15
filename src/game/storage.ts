const RANKING_KEY = 'tetris-tetsujin.ranking'
/** 旧「ベストスコア1件」時代のキー。移行はせず破棄するため、読み込み時に掃除する */
const LEGACY_BEST_SCORE_KEY = 'tetris-tetsujin.bestScore'

/** ランキングに保持する最大件数 */
export const RANKING_SIZE = 10

export interface RankingEntry {
  score: number
  /** ISO 8601 文字列 */
  date: string
}

export interface SaveResult {
  /** 保存後の上位 RANKING_SIZE 件 (スコア降順) */
  ranking: RankingEntry[]
  /** 今回のスコアの順位 (1始まり)。トップ10圏外なら null */
  rank: number | null
}

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

const isValidEntry = (value: unknown): value is RankingEntry => {
  if (typeof value !== 'object' || value === null) return false
  const { score, date } = value as { score?: unknown; date?: unknown }
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) return false
  if (typeof date !== 'string') return false
  return true
}

/** スコア降順に安定ソートし、最大 RANKING_SIZE 件へ切り詰める */
const normalize = (entries: RankingEntry[]): RankingEntry[] =>
  entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.score - a.entry.score || a.index - b.index)
    .slice(0, RANKING_SIZE)
    .map(({ entry }) => entry)

/** 保存済みランキングを返す。未保存・不正値・利用不可なら空配列 */
export const loadRanking = (): RankingEntry[] => {
  const storage = getStorage()
  if (!storage) return []

  // 旧 API のデータは移行せず破棄する
  try {
    storage.removeItem(LEGACY_BEST_SCORE_KEY)
  } catch {
    // 掃除の失敗は無視してよい
  }

  try {
    const raw = storage.getItem(RANKING_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const entries = parsed
      .filter(isValidEntry)
      .map((entry) => ({ score: Math.floor(entry.score), date: entry.date }))
    return normalize(entries)
  } catch {
    return []
  }
}

/**
 * スコアをランキングに登録し、保存後のランキングと順位を返す。
 * 同点の場合は既存エントリが上位 (新エントリは同点の後ろ) になる。
 * 保存に失敗しても計算結果は返す。
 */
export const saveScore = (score: number, date: Date = new Date()): SaveResult => {
  const entry: RankingEntry = {
    score: Math.floor(score),
    date: date.toISOString(),
  }

  // 既存を先に置くことで、同点時は既存エントリが上位になる
  const ranking = normalize([...loadRanking(), entry])
  const index = ranking.indexOf(entry)
  const rank = index === -1 ? null : index + 1

  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(RANKING_KEY, JSON.stringify(ranking))
    } catch {
      // 保存失敗 (QuotaExceeded / プライベートモード等) はゲーム進行に影響させない
    }
  }

  return { ranking, rank }
}

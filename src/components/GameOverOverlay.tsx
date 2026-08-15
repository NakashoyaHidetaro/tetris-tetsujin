import type { RankingEntry } from '../game/storage'
import './game-over-overlay.css'

/** 1〜3 位のトロフィー色 (金 / 銀 / 銅)。4 位以下は順位数字を出す */
const MEDAL_COLORS = ['#fbbf24', '#cbd5e1', '#d97706']

function RankMark({ position }: { position: number }) {
  const color = MEDAL_COLORS[position - 1]
  if (!color) return <span className="rank-number">{position}</span>
  return (
    <i
      className="bi bi-trophy-fill rank-trophy"
      style={{ color }}
      aria-hidden="true"
    />
  )
}

function RankingRow({
  entry,
  position,
  highlighted,
}: {
  entry: RankingEntry
  position: number
  highlighted: boolean
}) {
  return (
    <li
      className={`ranking-row${highlighted ? ' is-current' : ''}`}
      // スタッガード (順次) スライドインの遅延を順位から決める
      style={{ animationDelay: `${position * 60}ms` }}
    >
      <span className="ranking-rank">
        <RankMark position={position} />
      </span>
      <span className="ranking-score">{entry.score}</span>
      <span className="ranking-date">
        {new Date(entry.date).toLocaleDateString()}
      </span>
      {highlighted && (
        <i className="bi bi-stars ranking-current-mark" aria-hidden="true" />
      )}
    </li>
  )
}

export function GameOverOverlay({
  score,
  ranking,
  rank,
  onRestart,
}: {
  score: number
  ranking: RankingEntry[]
  rank: number | null
  onRestart: () => void
}) {
  return (
    <div className="overlay">
      <div className="overlay-panel">
        <p className="overlay-title">GAME OVER</p>
        <p className="overlay-score">
          <span className="overlay-score-label">SCORE</span>
          <span className="overlay-score-value">{score}</span>
        </p>

        {rank === 1 && (
          <p className="new-record">
            <i className="bi bi-trophy-fill" aria-hidden="true" />
            NEW RECORD!
          </p>
        )}

        {ranking.length > 0 ? (
          <ol className="ranking" aria-label="スコアランキング">
            {ranking.slice(0, 10).map((entry, i) => (
              <RankingRow
                key={`${entry.date}-${i}`}
                entry={entry}
                position={i + 1}
                highlighted={rank === i + 1}
              />
            ))}
          </ol>
        ) : (
          <p className="ranking-empty">まだ記録がありません</p>
        )}

        {/* 圏外 (rank === null) はランキング表に自分の行が出ないため補足を出す */}
        {rank === null && ranking.length > 0 && (
          <p className="ranking-out">今回はランキング圏外でした</p>
        )}

        <button type="button" autoFocus onClick={onRestart}>
          Restart
        </button>
      </div>
    </div>
  )
}

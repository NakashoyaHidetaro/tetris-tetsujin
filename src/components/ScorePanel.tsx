import './score-panel.css'

/**
 * 左パネルのスコア系スタッツ。「ラベル + 値」の行を並べる構造にしている
 */
function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export function ScorePanel({
  score,
  best,
  level,
  lines,
}: {
  score: number
  best: number
  level: number
  lines: number
}) {
  return (
    <section className="score-panel" aria-label="スコア">
      <StatRow label="SCORE" value={score} />
      <StatRow label="BEST" value={best} />
      <StatRow label="LEVEL" value={level} />
      <StatRow label="LINES" value={lines} />
    </section>
  )
}

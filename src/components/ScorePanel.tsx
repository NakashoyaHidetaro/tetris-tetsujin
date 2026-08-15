import './score-panel.css'

/**
 * 左パネルのスコア系スタッツ。将来 LEVEL / LINES (#1/#3/#6) を足せるよう、
 * 「ラベル + 値」の行を並べる構造にしている
 */
function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export function ScorePanel({ score, best }: { score: number; best: number }) {
  return (
    <section className="score-panel" aria-label="スコア">
      <StatRow label="SCORE" value={score} />
      <StatRow label="BEST" value={best} />
    </section>
  )
}

import { tetrominoOf } from '../game/tetrominoes'
import type { TetrominoType } from '../game/types'
import './next-panel.css'

/**
 * ミノ 1 個ぶんのプレビュー。shape をそのまま (I なら 4x1、O なら 2x2)
 * 専用グリッドで描く。盤面の 24px グリッド (.board) には依存しない
 */
function NextPreview({ type }: { type: TetrominoType }) {
  const { shape, color } = tetrominoOf(type)
  return (
    <div
      className="next-preview"
      style={{ gridTemplateColumns: `repeat(${shape[0].length}, var(--next-cell))` }}
    >
      {shape.flatMap((row, y) =>
        row.map((filled, x) => (
          <div
            key={`${y}-${x}`}
            className={filled ? 'next-cell filled' : 'next-cell'}
            style={filled ? { background: color } : undefined}
          />
        )),
      )}
    </div>
  )
}

/**
 * 右パネルのネクスト表示 (PRD #1)。ポーズ中 (PRD #4) は「見て考える時間」に
 * ならないよう中身だけ伏せ、パネル枠と NEXT 見出しは残す
 */
export function NextPanel({
  queue,
  paused,
}: {
  queue: TetrominoType[]
  paused: boolean
}) {
  return (
    <section className="next-panel" aria-label="ネクスト">
      <span className="next-label">NEXT</span>
      <ol className="next-list">
        {queue.map((type, i) => (
          <li className="next-slot" key={`${i}-${type}`}>
            {paused ? (
              <span className="next-hidden" aria-label="ポーズ中は非表示">
                ?
              </span>
            ) : (
              <NextPreview type={type} />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

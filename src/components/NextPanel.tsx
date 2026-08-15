import { trimShape } from '../game/piece'
import { tetrominoOf } from '../game/tetrominoes'
import type { TetrominoType } from '../game/types'
import './next-panel.css'

/**
 * ミノ 1 個ぶんのプレビュー。SRS 用の形状は 3x3 / 4x4 の余白込みなので、
 * trimShape で詰めてから (I なら 4x1、O なら 2x2) 専用グリッドで描く。
 * 盤面の 24px グリッド (.board) には依存しない
 */
export function NextPreview({ type }: { type: TetrominoType }) {
  const { color } = tetrominoOf(type)
  const shape = trimShape(tetrominoOf(type).shape)
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
            // color は CSS 変数参照なのでテーマ / パレット切替に追従する (PRD #9)。
            // data-mino は記号表示 (PRD #17) 用で、CSS 側が中身を描く
            data-mino={filled ? type : undefined}
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

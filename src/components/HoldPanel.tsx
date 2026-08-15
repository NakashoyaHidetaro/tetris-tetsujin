import type { TetrominoType } from '../game/types'
import { NextPreview } from './NextPanel'
import './hold-panel.css'

/**
 * 左パネルのホールド表示 (PRD #6)。プレビューの描き方は NextPanel と共有する。
 *
 * - 枠が空のときはプレースホルダ (—) を出す
 * - 現在ミノでホールドを使い切っている間 (used) は薄く表示して「今は使えない」を示す
 * - ポーズ中は NextPanel と同じく中身だけ伏せる (先読み防止の一貫性)
 */
export function HoldPanel({
  hold,
  used,
  paused,
}: {
  hold: TetrominoType | null
  used: boolean
  paused: boolean
}) {
  return (
    <section className="hold-panel" aria-label="ホールド">
      <span className="hold-label">HOLD</span>
      <div className={used ? 'hold-slot used' : 'hold-slot'}>
        {paused ? (
          <span className="hold-empty" aria-label="ポーズ中は非表示">
            ?
          </span>
        ) : hold ? (
          <NextPreview type={hold} />
        ) : (
          <span className="hold-empty">—</span>
        )}
      </div>
    </section>
  )
}

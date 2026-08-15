import './pause-overlay.css'

/**
 * ポーズ表示 (PRD #4)。ユーザー決定により盤面は隠さないので、背景は
 * ほぼ透過にしてラベルだけを盤面の上に重ねる
 */
export function PauseOverlay() {
  return (
    <div className="pause-overlay" role="status">
      <div className="pause-panel">
        <p className="pause-title">PAUSED</p>
        <p className="pause-hint">P / Esc で再開</p>
      </div>
    </div>
  )
}

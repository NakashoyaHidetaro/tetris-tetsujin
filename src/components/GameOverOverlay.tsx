import './game-over-overlay.css'

export function GameOverOverlay({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="overlay">
      <p>Game Over</p>
      <button type="button" autoFocus onClick={onRestart}>
        Restart
      </button>
    </div>
  )
}

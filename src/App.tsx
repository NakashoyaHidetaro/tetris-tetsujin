import { Board } from './components/Board'
import { GameOverOverlay } from './components/GameOverOverlay'
import { HelpBar } from './components/HelpBar'
import { NextPanel } from './components/NextPanel'
import { ScorePanel } from './components/ScorePanel'
import { useTetris } from './hooks/useTetris'

export default function App() {
  const { state, best, ranking, lastRank, restart } = useTetris()

  return (
    <div className="game">
      {/* 左パネル + 盤面の横並び (PRD UX / Mockups の配置合意) */}
      <div className="game-main">
        <div className="side-panel side-panel-left">
          <ScorePanel score={state.score} best={best} />
        </div>
        <Board
          board={state.board}
          piece={state.piece}
          over={state.over}
          paused={state.paused}
        />
        <div className="side-panel side-panel-right">
          <NextPanel queue={state.queue} paused={state.paused} />
        </div>
      </div>
      <HelpBar />
      {state.over && (
        <GameOverOverlay
          score={state.score}
          ranking={ranking}
          rank={lastRank}
          onRestart={restart}
        />
      )}
    </div>
  )
}

import { Board } from './components/Board'
import { GameOverOverlay } from './components/GameOverOverlay'
import { HelpBar } from './components/HelpBar'
import { ScorePanel } from './components/ScorePanel'
import { useTetris } from './hooks/useTetris'

export default function App() {
  const { state, restart } = useTetris()

  return (
    <div className="game">
      <ScorePanel score={state.score} />
      <Board board={state.board} piece={state.piece} />
      {state.over && <GameOverOverlay onRestart={restart} />}
      <HelpBar />
    </div>
  )
}

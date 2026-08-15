import { Board } from './components/Board'
import { GameOverOverlay } from './components/GameOverOverlay'
import { HelpBar } from './components/HelpBar'
import { HoldPanel } from './components/HoldPanel'
import { NextPanel } from './components/NextPanel'
import { ScorePanel } from './components/ScorePanel'
import { ThemeToggle } from './components/ThemeToggle'
import { TouchControls } from './components/TouchControls'
import { MuteToggle } from './components/sound/MuteToggle'
import { SoundManager } from './components/sound/SoundManager'
import { useTetris } from './hooks/useTetris'

export default function App() {
  const {
    state,
    best,
    ranking,
    lastRank,
    restart,
    moveLeft,
    moveRight,
    rotate,
    softDrop,
    hardDrop,
    hold,
    togglePause,
  } = useTetris()

  return (
    <div className="game">
      {/* 左パネル + 盤面の横並び (PRD UX / Mockups の配置合意) */}
      <div className="game-main">
        <div className="side-panel side-panel-left">
          {/* HOLD はスコア系スタッツの上 (PRD UX / Mockups の左パネル合意) */}
          <HoldPanel hold={state.hold} used={state.holdUsed} paused={state.paused} />
          <ScorePanel
            score={state.score}
            best={best}
            level={state.level}
            lines={state.lines}
          />
          <ThemeToggle />
          <MuteToggle />
        </div>
        <Board
          board={state.board}
          piece={state.piece}
          over={state.over}
          paused={state.paused}
          clear={state.lastClear}
          hardDropId={state.hardDropId}
        />
        <div className="side-panel side-panel-right">
          <NextPanel queue={state.queue} paused={state.paused} />
        </div>
      </div>
      <HelpBar />
      <SoundManager state={state} />
      <TouchControls
        onMoveLeft={moveLeft}
        onMoveRight={moveRight}
        onRotate={rotate}
        onSoftDrop={softDrop}
        onHardDrop={hardDrop}
        onHold={hold}
        onTogglePause={togglePause}
        paused={state.paused}
        disabled={state.over}
      />
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

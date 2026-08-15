import { useCallback, useMemo, useState } from 'react'
import { AutoToggle } from './components/AutoToggle'
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
import { useAutoPlay } from './hooks/useAutoPlay'
import { useTetris } from './hooks/useTetris'

export default function App() {
  // 自動プレイ (AI) の ON/OFF。手動操作が入ったら OFF に戻す
  const [auto, setAuto] = useState(false)
  // setState の setter は安定なので、この参照も変わらない (useTetris の
  // keydown 効果を張り直さない)
  const stopAuto = useCallback(() => setAuto(false), [])

  const {
    state,
    best,
    ranking,
    lastRank,
    controls,
    restart,
    moveLeft,
    moveRight,
    rotate,
    softDrop,
    hardDrop,
    hold,
    togglePause,
  } = useTetris({ onManualInput: stopAuto })

  useAutoPlay(state, controls, auto)

  // タッチ操作もキーボードと同じく「手動操作」なので自動を解除する。
  // ポーズだけは自動を維持したいのでそのまま渡す
  const touch = useMemo(
    () => ({
      moveLeft: () => {
        stopAuto()
        moveLeft()
      },
      moveRight: () => {
        stopAuto()
        moveRight()
      },
      rotate: () => {
        stopAuto()
        rotate()
      },
      softDrop: () => {
        stopAuto()
        softDrop()
      },
      hardDrop: () => {
        stopAuto()
        hardDrop()
      },
      hold: () => {
        stopAuto()
        hold()
      },
    }),
    [stopAuto, moveLeft, moveRight, rotate, softDrop, hardDrop, hold],
  )

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
          <AutoToggle enabled={auto} onChange={setAuto} />
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
        onMoveLeft={touch.moveLeft}
        onMoveRight={touch.moveRight}
        onRotate={touch.rotate}
        onSoftDrop={touch.softDrop}
        onHardDrop={touch.hardDrop}
        onHold={touch.hold}
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

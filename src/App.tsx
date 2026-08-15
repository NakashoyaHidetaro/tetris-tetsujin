import { useCallback, useMemo, useState } from 'react'
import { AutoToggle } from './components/AutoToggle'
import { Board } from './components/Board'
import { GameOverOverlay } from './components/GameOverOverlay'
import { HelpBar } from './components/HelpBar'
import { HoldPanel } from './components/HoldPanel'
import { MenuDrawer } from './components/MenuDrawer'
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

  /*
   * 左パネルの中身。PC では .side-panel-left に、モバイルでは MenuDrawer の中に
   * 出す。同じ要素を 2 箇所に描いて CSS (メディアクエリ) で片方を隠す方式なので、
   * それぞれ独立したインスタンスになる。いずれも状態を外 (localStorage / ストア /
   * App の state) に持つコンポーネントなので二重に描いても破綻しない
   */
  const panels = (
    <>
      {/* HOLD はスコア系スタッツの上 (PRD UX / Mockups の左パネル合意) */}
      <HoldPanel hold={state.hold} used={state.holdUsed} paused={state.paused} />
      <ScorePanel score={state.score} best={best} level={state.level} lines={state.lines} />
      <ThemeToggle />
      <AutoToggle enabled={auto} onChange={setAuto} />
      <MuteToggle />
    </>
  )

  return (
    <div className="game">
      {/* 左パネル + 盤面の横並び (PRD UX / Mockups の配置合意) */}
      <div className="game-main">
        <div className="side-panel side-panel-left">{panels}</div>
        <Board
          board={state.board}
          piece={state.piece}
          over={state.over}
          paused={state.paused}
          clear={state.lastClear}
          hardDropId={state.hardDropId}
        />
        <div className="side-panel side-panel-right">
          {/* モバイル専用。開閉ボタンだけが見えて、中身はドロワーに収まる */}
          <MenuDrawer>{panels}</MenuDrawer>
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

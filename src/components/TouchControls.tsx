import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import './touch-controls.css'

/**
 * タッチ操作用のオンスクリーンコントローラ (PRD #16 モバイル対応)。
 *
 * - ゲーム状態は一切持たず、操作はすべて props のコールバックに委譲する
 *   (useTetris には依存しない = キーボード操作と同じ入口を共有する)
 * - 表示は CSS の `@media (pointer: coarse)` に任せ、マウス環境では出さない
 * - 左右移動とソフトドロップは長押しでリピートする (DAS/ARR 相当)
 */

/** 長押しからリピートが始まるまでの待ち時間 (ms)。PRD #15 の DAS 既定値に合わせる */
export const REPEAT_DELAY_MS = 170
/** リピート中の連続入力間隔 (ms)。PRD #15 の ARR 既定値に合わせる */
export const REPEAT_INTERVAL_MS = 50

type RepeatButtonProps = {
  label: string
  ariaLabel: string
  onTrigger: () => void
  /** true なら長押し中リピートする */
  repeat?: boolean
  disabled?: boolean
  className?: string
  pressed?: boolean
}

/**
 * pointer イベントで駆動するボタン。
 * click ではなく pointerdown を入口にすることで、タップの押下と同時に反応させ、
 * かつマウス/タッチ/ペンを 1 系統のハンドラで扱う (click は購読しないので二重発火しない)
 */
function RepeatButton({
  label,
  ariaLabel,
  onTrigger,
  repeat = false,
  disabled = false,
  className,
  pressed,
}: RepeatButtonProps) {
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 最新のコールバックを参照し続けるための箱 (タイマー再設定を避ける)
  const triggerRef = useRef(onTrigger)

  useEffect(() => {
    triggerRef.current = onTrigger
  }, [onTrigger])

  const stop = useCallback(() => {
    if (delayRef.current !== null) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // アンマウント時・disabled 化時にタイマーを取り残さない
  useEffect(() => stop, [stop])
  useEffect(() => {
    if (disabled) stop()
  }, [disabled, stop])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      // タッチのスクロール・長押しメニュー・ダブルタップズームを抑止する
      event.preventDefault()
      if (disabled) return

      // 押した指を離すまでイベントを受け続ける (ボタン外へずれても pointerup を拾う)
      const target = event.currentTarget
      if (typeof target.setPointerCapture === 'function') {
        try {
          target.setPointerCapture(event.pointerId)
        } catch {
          // 一部環境 (テスト用 DOM 等) では未対応。捕捉できなくても動作に支障はない
        }
      }

      stop()
      triggerRef.current()

      if (!repeat) return
      delayRef.current = setTimeout(() => {
        delayRef.current = null
        intervalRef.current = setInterval(() => triggerRef.current(), REPEAT_INTERVAL_MS)
      }, REPEAT_DELAY_MS)
    },
    [disabled, repeat, stop],
  )

  return (
    <button
      type="button"
      className={className ? `touch-btn ${className}` : 'touch-btn'}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  )
}

export type TouchControlsProps = {
  onMoveLeft: () => void
  onMoveRight: () => void
  onRotate: () => void
  onSoftDrop: () => void
  onHardDrop: () => void
  onHold?: () => void
  onTogglePause?: () => void
  /** ポーズ中か。ポーズ解除以外の操作を伏せ、ポーズボタンの表示を切り替える */
  paused?: boolean
  /** ゲームオーバー等で操作を受け付けない状態 */
  disabled?: boolean
}

export function TouchControls({
  onMoveLeft,
  onMoveRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
  onHold,
  onTogglePause,
  paused = false,
  disabled = false,
}: TouchControlsProps) {
  // ポーズ中はゲームプレイ入力を止める (再開操作だけ残す = PRD #4 の要件と揃える)
  const playDisabled = disabled || paused

  return (
    <div className="touch-controls" role="group" aria-label="タッチ操作">
      <div className="touch-cluster touch-cluster-move">
        <RepeatButton
          label="◀"
          ariaLabel="左に移動"
          className="touch-btn-left"
          onTrigger={onMoveLeft}
          repeat
          disabled={playDisabled}
        />
        <RepeatButton
          label="▼"
          ariaLabel="ソフトドロップ"
          className="touch-btn-soft"
          onTrigger={onSoftDrop}
          repeat
          disabled={playDisabled}
        />
        <RepeatButton
          label="▶"
          ariaLabel="右に移動"
          className="touch-btn-right"
          onTrigger={onMoveRight}
          repeat
          disabled={playDisabled}
        />
      </div>

      <div className="touch-cluster touch-cluster-action">
        {onHold && (
          <RepeatButton
            label="HOLD"
            ariaLabel="ホールド"
            className="touch-btn-hold"
            onTrigger={onHold}
            disabled={playDisabled}
          />
        )}
        <RepeatButton
          label="⟳"
          ariaLabel="回転"
          className="touch-btn-rotate"
          onTrigger={onRotate}
          disabled={playDisabled}
        />
        <RepeatButton
          label="⤓"
          ariaLabel="ハードドロップ"
          className="touch-btn-hard"
          onTrigger={onHardDrop}
          disabled={playDisabled}
        />
        {onTogglePause && (
          <RepeatButton
            label={paused ? '▶' : '❚❚'}
            ariaLabel={paused ? '再開' : 'ポーズ'}
            className="touch-btn-pause"
            onTrigger={onTogglePause}
            pressed={paused}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  )
}

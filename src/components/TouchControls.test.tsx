import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { REPEAT_DELAY_MS, REPEAT_INTERVAL_MS, TouchControls } from './TouchControls'

/**
 * タッチ操作 UI (PRD #16) のテスト。
 * ゲーム状態は持たないコンポーネントなので「押下で props のコールバックが呼ばれるか」と
 * 「長押しでリピートし、離すと止まるか」だけを押さえる
 */

function setup(overrides: Partial<Parameters<typeof TouchControls>[0]> = {}) {
  const handlers = {
    onMoveLeft: vi.fn(),
    onMoveRight: vi.fn(),
    onRotate: vi.fn(),
    onSoftDrop: vi.fn(),
    onHardDrop: vi.fn(),
    onHold: vi.fn(),
    onTogglePause: vi.fn(),
  }
  render(<TouchControls {...handlers} {...overrides} />)
  return handlers
}

describe('TouchControls', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('各ボタンの押下でそれぞれのコールバックが 1 回呼ばれる', () => {
    const h = setup()

    const cases: [string, ReturnType<typeof vi.fn>][] = [
      ['左に移動', h.onMoveLeft],
      ['右に移動', h.onMoveRight],
      ['回転', h.onRotate],
      ['ソフトドロップ', h.onSoftDrop],
      ['ハードドロップ', h.onHardDrop],
      ['ホールド', h.onHold],
      ['ポーズ', h.onTogglePause],
    ]

    for (const [label, fn] of cases) {
      fireEvent.pointerDown(screen.getByRole('button', { name: label }))
      expect(fn, label).toHaveBeenCalledTimes(1)
    }
  })

  it('onHold / onTogglePause を渡さなければそのボタンは出ない', () => {
    setup({ onHold: undefined, onTogglePause: undefined })

    expect(screen.queryByRole('button', { name: 'ホールド' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ポーズ' })).not.toBeInTheDocument()
  })

  it('長押しすると DAS 経過後に ARR 間隔でリピートし、離すと止まる', () => {
    vi.useFakeTimers()
    const h = setup()
    const left = screen.getByRole('button', { name: '左に移動' })

    fireEvent.pointerDown(left)
    expect(h.onMoveLeft).toHaveBeenCalledTimes(1)

    // DAS 経過前はリピートしない
    act(() => void vi.advanceTimersByTime(REPEAT_DELAY_MS - 1))
    expect(h.onMoveLeft).toHaveBeenCalledTimes(1)

    // DAS 経過後は ARR ごとに 1 回ずつ増える
    act(() => void vi.advanceTimersByTime(1 + REPEAT_INTERVAL_MS * 3))
    expect(h.onMoveLeft).toHaveBeenCalledTimes(4)

    fireEvent.pointerUp(left)
    act(() => void vi.advanceTimersByTime(REPEAT_INTERVAL_MS * 5))
    expect(h.onMoveLeft).toHaveBeenCalledTimes(4)
  })

  it('リピートしないボタン (回転) は押しっぱなしでも 1 回だけ', () => {
    vi.useFakeTimers()
    const h = setup()

    fireEvent.pointerDown(screen.getByRole('button', { name: '回転' }))
    act(() => void vi.advanceTimersByTime(REPEAT_DELAY_MS + REPEAT_INTERVAL_MS * 10))

    expect(h.onRotate).toHaveBeenCalledTimes(1)
  })

  it('pointercancel でもリピートが止まる', () => {
    vi.useFakeTimers()
    const h = setup()
    const right = screen.getByRole('button', { name: '右に移動' })

    fireEvent.pointerDown(right)
    act(() => void vi.advanceTimersByTime(REPEAT_DELAY_MS + REPEAT_INTERVAL_MS))
    const calls = h.onMoveRight.mock.calls.length
    expect(calls).toBeGreaterThan(1)

    fireEvent.pointerCancel(right)
    act(() => void vi.advanceTimersByTime(REPEAT_INTERVAL_MS * 5))
    expect(h.onMoveRight).toHaveBeenCalledTimes(calls)
  })

  it('ポーズ中はプレイ操作が無効になり、再開ボタンだけ生きている', () => {
    const h = setup({ paused: true })

    const left = screen.getByRole('button', { name: '左に移動' })
    expect(left).toBeDisabled()
    fireEvent.pointerDown(left)
    expect(h.onMoveLeft).not.toHaveBeenCalled()

    const resume = screen.getByRole('button', { name: '再開' })
    expect(resume).toBeEnabled()
    fireEvent.pointerDown(resume)
    expect(h.onTogglePause).toHaveBeenCalledTimes(1)
  })

  it('disabled ならポーズボタンも含めて全て無効', () => {
    const h = setup({ disabled: true })

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
      fireEvent.pointerDown(button)
    }
    expect(h.onTogglePause).not.toHaveBeenCalled()
    expect(h.onHardDrop).not.toHaveBeenCalled()
  })
})

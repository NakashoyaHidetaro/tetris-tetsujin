import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Board } from './Board'
import { emptyBoard } from '../game/board'
import { createPiece } from '../game/piece'
import { DEFAULT_GESTURE_CONFIG } from './boardGestures'
import type { ClearInfo } from '../game/types'

/**
 * 盤面表示 (PRD #7 演出 / #16 ジェスチャ操作) のテスト。
 *
 * ここが守るリグレッション:
 * - ゲームオーバー時に操作不能なミノが描かれ続ける / グレーアウトが外れる
 * - ゴースト表示が消える (着地位置が読めなくなる)
 * - 消去・着地演出が出ない、または出っぱなしで盤面に residual が残る
 * - 盤面ジェスチャがマウスで誤爆する / props 未指定時に挙動が変わる (後方互換)
 */

const CELL = DEFAULT_GESTURE_CONFIG.cellSize

const baseProps = () => ({
  board: emptyBoard(),
  piece: createPiece('T'),
  over: false,
})

const clearInfo = (id: number, rows: number[]): ClearInfo => ({
  id,
  rows,
  cleared: rows.length,
  tspin: false,
  points: 100,
})

const boardWrap = (container: HTMLElement) =>
  container.querySelector('.board-wrap') as HTMLElement

describe('Board', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('盤面 10x20 ぶんのセルを描く', () => {
    const { container } = render(<Board {...baseProps()} />)

    expect(container.querySelectorAll('.cell')).toHaveLength(200)
  })

  it('落下中のミノにはゴースト (着地位置) が付く', () => {
    const { container } = render(<Board {...baseProps()} />)

    // T ミノは 4 セル。空盤面なのでゴーストも 4 セル出る
    expect(container.querySelectorAll('.cell.ghost')).toHaveLength(4)
  })

  it('ゲームオーバー時はミノもゴーストも描かず、盤面をグレーアウトする', () => {
    const { container } = render(<Board {...baseProps()} over />)

    expect(boardWrap(container)).toHaveClass('over')
    expect(container.querySelectorAll('.cell.ghost')).toHaveLength(0)
    expect(container.querySelectorAll('.cell[data-mino]')).toHaveLength(0)
  })

  it('ポーズ中は盤面を隠さず PAUSED を重ねる', () => {
    const { container } = render(<Board {...baseProps()} paused />)

    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(container.querySelectorAll('.cell')).toHaveLength(200)
  })

  it('ゲームオーバー中はポーズ表示を出さない', () => {
    render(<Board {...baseProps()} over paused />)

    expect(screen.queryByText('PAUSED')).not.toBeInTheDocument()
  })

  it('消去情報を受け取ると該当行だけフラッシュし、一定時間で消える', () => {
    vi.useFakeTimers()
    const { container } = render(<Board {...baseProps()} clear={clearInfo(1, [18, 19])} />)

    const rows = container.querySelectorAll('.clear-flash-row')
    expect(rows).toHaveLength(2)
    // gridRow は 1 始まりなので行番号 + 1
    expect(rows[0]).toHaveStyle({ gridRow: '19' })

    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector('.clear-flash')).toBeNull()
  })

  it('連続した消去では演出の key が入れ替わる (アニメーションが再生され直す)', () => {
    vi.useFakeTimers()
    const props = baseProps()
    const { container, rerender } = render(<Board {...props} clear={clearInfo(1, [19])} />)
    const first = container.querySelector('.clear-flash-row')

    rerender(<Board {...props} clear={clearInfo(2, [17])} />)
    const second = container.querySelector('.clear-flash-row')

    expect(second).not.toBe(first)
    expect(second).toHaveStyle({ gridRow: '18' })
  })

  it('hardDropId が増えるたびに着地演出を 1 回再生する', () => {
    vi.useFakeTimers()
    const props = baseProps()
    const { container, rerender } = render(<Board {...props} hardDropId={0} />)
    expect(container.querySelector('.drop-impact')).toBeNull()

    rerender(<Board {...props} hardDropId={1} />)
    expect(container.querySelector('.drop-impact')).not.toBeNull()

    act(() => vi.advanceTimersByTime(1000))
    expect(container.querySelector('.drop-impact')).toBeNull()
  })
})

describe('Board のジェスチャ操作 (PRD #16)', () => {
  const handlers = () => ({
    onMoveLeft: vi.fn(),
    onMoveRight: vi.fn(),
    onRotate: vi.fn(),
    onSoftDrop: vi.fn(),
    onHardDrop: vi.fn(),
  })

  const touch = (overrides: Record<string, unknown>) => ({
    pointerId: 1,
    pointerType: 'touch',
    ...overrides,
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('操作 props を渡さなければジェスチャ用のクラスも付かない (後方互換)', () => {
    const { container } = render(<Board {...baseProps()} />)

    expect(boardWrap(container)).not.toHaveClass('gesture-area')
  })

  it('操作 props を渡すとジェスチャ受付用のクラスが付く', () => {
    const { container } = render(<Board {...baseProps()} {...handlers()} />)

    expect(boardWrap(container)).toHaveClass('gesture-area')
  })

  it('横スワイプでセル幅ごとに移動する', () => {
    const h = handlers()
    const { container } = render(<Board {...baseProps()} {...h} />)
    const wrap = boardWrap(container)

    fireEvent.pointerDown(wrap, touch({ clientX: 0, clientY: 0 }))
    fireEvent.pointerMove(wrap, touch({ clientX: CELL * 2, clientY: 0 }))
    fireEvent.pointerUp(wrap, touch({ clientX: CELL * 2, clientY: 0 }))

    expect(h.onMoveRight).toHaveBeenCalledTimes(2)
    expect(h.onMoveLeft).not.toHaveBeenCalled()
    expect(h.onRotate).not.toHaveBeenCalled()
  })

  it('タップで回転する', () => {
    const h = handlers()
    const { container } = render(<Board {...baseProps()} {...h} />)
    const wrap = boardWrap(container)

    fireEvent.pointerDown(wrap, touch({ clientX: 40, clientY: 40 }))
    fireEvent.pointerUp(wrap, touch({ clientX: 41, clientY: 40 }))

    expect(h.onRotate).toHaveBeenCalledTimes(1)
  })

  it('素早い下フリックでハードドロップする', () => {
    const h = handlers()
    const { container } = render(<Board {...baseProps()} {...h} />)
    const wrap = boardWrap(container)

    fireEvent.pointerDown(wrap, touch({ clientX: 0, clientY: 0 }))
    fireEvent.pointerMove(wrap, touch({ clientX: 0, clientY: CELL * 4 }))

    expect(h.onHardDrop).toHaveBeenCalledTimes(1)
    expect(h.onSoftDrop).not.toHaveBeenCalled()
  })

  it('ゆっくりした下スワイプはソフトドロップになる', () => {
    vi.useFakeTimers()
    const h = handlers()
    const { container } = render(<Board {...baseProps()} {...h} />)
    const wrap = boardWrap(container)

    fireEvent.pointerDown(wrap, touch({ clientX: 0, clientY: 0 }))
    act(() => vi.advanceTimersByTime(600))
    fireEvent.pointerMove(wrap, touch({ clientX: 0, clientY: CELL * 2 }))

    expect(h.onSoftDrop).toHaveBeenCalledTimes(2)
    expect(h.onHardDrop).not.toHaveBeenCalled()
  })

  it('マウス操作では反応しない (PC のクリックで誤爆させない)', () => {
    const h = handlers()
    const { container } = render(<Board {...baseProps()} {...h} />)
    const wrap = boardWrap(container)

    fireEvent.pointerDown(wrap, { pointerId: 2, pointerType: 'mouse', clientX: 0, clientY: 0 })
    fireEvent.pointerMove(wrap, { pointerId: 2, pointerType: 'mouse', clientX: CELL * 3, clientY: 0 })
    fireEvent.pointerUp(wrap, { pointerId: 2, pointerType: 'mouse', clientX: CELL * 3, clientY: 0 })

    expect(h.onMoveRight).not.toHaveBeenCalled()
    expect(h.onRotate).not.toHaveBeenCalled()
  })

  it('ポーズ中・ゲームオーバー中はジェスチャを受け付けない', () => {
    for (const props of [{ paused: true }, { over: true }]) {
      const h = handlers()
      const { container } = render(<Board {...baseProps()} {...props} {...h} />)
      const wrap = boardWrap(container)

      expect(wrap).not.toHaveClass('gesture-area')
      fireEvent.pointerDown(wrap, touch({ clientX: 0, clientY: 0 }))
      fireEvent.pointerUp(wrap, touch({ clientX: 0, clientY: 0 }))

      expect(h.onRotate).not.toHaveBeenCalled()
      cleanup()
    }
  })

  it('ポインタがキャンセルされたら回転を発火しない', () => {
    const h = handlers()
    const { container } = render(<Board {...baseProps()} {...h} />)
    const wrap = boardWrap(container)

    fireEvent.pointerDown(wrap, touch({ clientX: 40, clientY: 40 }))
    fireEvent.pointerCancel(wrap, touch({ clientX: 40, clientY: 40 }))

    expect(h.onRotate).not.toHaveBeenCalled()
  })
})

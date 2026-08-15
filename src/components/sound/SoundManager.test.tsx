import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { emptyBoard } from '../../game/board'
import type { Piece } from '../../game/types'
import { SoundManager } from './SoundManager'
import type { SoundEvent, SoundSnapshot } from './events'

const piece = (over: Partial<Piece> = {}): Piece => ({
  type: 'I',
  shape: [[1, 1]],
  rotation: 0,
  color: '#0ff',
  x: 4,
  y: 0,
  ...over,
})

const snapshot = (over: Partial<SoundSnapshot> = {}): SoundSnapshot => ({
  board: emptyBoard(),
  piece: piece(),
  pieceId: 1,
  lines: 0,
  level: 1,
  over: false,
  paused: false,
  ...over,
})

describe('SoundManager', () => {
  afterEach(cleanup)

  it('何も描画しない', () => {
    const { container } = render(<SoundManager state={snapshot()} play={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('初回マウントでは鳴らさない', () => {
    const play = vi.fn<(event: SoundEvent) => void>()
    render(<SoundManager state={snapshot()} play={play} />)
    expect(play).not.toHaveBeenCalled()
  })

  it('state の差分から効果音を発火する', () => {
    const play = vi.fn<(event: SoundEvent) => void>()
    const { rerender } = render(<SoundManager state={snapshot()} play={play} />)

    rerender(<SoundManager state={snapshot({ piece: piece({ x: 5 }) })} play={play} />)
    expect(play).toHaveBeenCalledWith('move')

    play.mockClear()
    rerender(<SoundManager state={snapshot({ over: true })} play={play} />)
    expect(play).toHaveBeenCalledWith('gameOver')
  })

  it('同じ state で再描画しても重複発火しない', () => {
    const play = vi.fn<(event: SoundEvent) => void>()
    const moved = snapshot({ piece: piece({ x: 5 }) })
    const { rerender } = render(<SoundManager state={snapshot()} play={play} />)

    rerender(<SoundManager state={moved} play={play} />)
    play.mockClear()
    rerender(<SoundManager state={{ ...moved }} play={play} />)
    expect(play).not.toHaveBeenCalled()
  })
})

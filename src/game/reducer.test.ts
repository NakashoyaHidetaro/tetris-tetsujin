import { describe, expect, it } from 'vitest'
import { QUEUE_SIZE } from './bag'
import { gameReducer } from './reducer'
import { newGame } from './transitions'
import type { TetrominoType } from './types'

describe('gameReducer', () => {
  it('hardDrop は pieceId が一致しないと同一の state 参照を返す (世代ガード)', () => {
    const state = newGame()
    expect(gameReducer(state, { type: 'hardDrop', pieceId: state.pieceId + 1 })).toBe(state)
  })

  it('hardDrop は pieceId が一致すると固定まで進める', () => {
    const state = newGame()
    const next = gameReducer(state, { type: 'hardDrop', pieceId: state.pieceId })
    expect(next.pieceId).toBe(state.pieceId + 1)
  })

  it('over 中は tick / move / rotate / softDrop が同一の state 参照を返す', () => {
    const state = { ...newGame(), over: true }
    expect(gameReducer(state, { type: 'tick' })).toBe(state)
    expect(gameReducer(state, { type: 'move', dx: 1 })).toBe(state)
    expect(gameReducer(state, { type: 'rotate' })).toBe(state)
    expect(gameReducer(state, { type: 'softDrop' })).toBe(state)
  })

  it('togglePause は paused をトグルする', () => {
    const state = newGame()
    const paused = gameReducer(state, { type: 'togglePause' })
    expect(paused.paused).toBe(true)
    expect(gameReducer(paused, { type: 'togglePause' }).paused).toBe(false)
  })

  it('over 中の togglePause は同一の state 参照を返す', () => {
    const state = { ...newGame(), over: true }
    expect(gameReducer(state, { type: 'togglePause' })).toBe(state)
  })

  it('paused 中は tick / move / rotate / softDrop / hardDrop が同一の state 参照を返す', () => {
    const state = { ...newGame(), paused: true }
    expect(gameReducer(state, { type: 'tick' })).toBe(state)
    expect(gameReducer(state, { type: 'move', dx: 1 })).toBe(state)
    expect(gameReducer(state, { type: 'rotate' })).toBe(state)
    expect(gameReducer(state, { type: 'softDrop' })).toBe(state)
    expect(gameReducer(state, { type: 'hardDrop', pieceId: state.pieceId })).toBe(state)
  })

  it('restart で初期状態に戻る', () => {
    const state = {
      ...newGame(),
      score: 500,
      over: true,
      paused: true,
      pieceId: 7,
      queue: [] as TetrominoType[],
      bag: [] as TetrominoType[],
    }
    const next = gameReducer(state, { type: 'restart' })
    expect(next.score).toBe(0)
    expect(next.over).toBe(false)
    expect(next.pieceId).toBe(0)
    expect(next.paused).toBe(false)
    expect(next.queue).toHaveLength(QUEUE_SIZE)
    expect(next.queue.length + next.bag.length).toBe(6)
  })
})

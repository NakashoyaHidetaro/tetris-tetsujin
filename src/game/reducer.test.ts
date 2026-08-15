import { describe, expect, it } from 'vitest'
import { QUEUE_SIZE } from './bag'
import { gameReducer } from './reducer'
import { createPiece } from './piece'
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

  it('lock は世代が一致し接地しているときだけ固定する (ロックディレイ満了)', () => {
    const state = newGame()
    // 空中では固定しない
    expect(gameReducer(state, { type: 'lock', pieceId: state.pieceId })).toBe(state)

    const grounded = gameReducer({ ...state, grounded: true }, { type: 'lock', pieceId: state.pieceId })
    expect(grounded.pieceId).toBe(state.pieceId + 1)
  })

  it('世代が進んだ後に届いた lock は破棄される', () => {
    const state = { ...newGame(), grounded: true }
    expect(gameReducer(state, { type: 'lock', pieceId: state.pieceId + 1 })).toBe(state)
  })

  it('hold はホールド枠を埋めてネクストを進める', () => {
    const state = newGame()
    const next = gameReducer(state, { type: 'hold' })
    expect(next.hold).toBe(state.piece.type)
    expect(next.piece.type).toBe(state.queue[0])
    // 同一ミノでの連続ホールドは次のロックまで不可
    expect(gameReducer(next, { type: 'hold' })).toBe(next)
  })

  it('rotate は方向を受け取る', () => {
    const state = { ...newGame(), piece: createPiece('T') }
    const cw = gameReducer(state, { type: 'rotate', dir: 'cw' })
    const ccw = gameReducer(state, { type: 'rotate', dir: 'ccw' })
    expect(cw.piece.rotation).toBe(1)
    expect(ccw.piece.rotation).toBe(3)
  })

  it('softDrop は 1 セル 1 点を加算する', () => {
    const state = { ...newGame(), score: 0 }
    expect(gameReducer(state, { type: 'softDrop' }).score).toBe(1)
    expect(gameReducer(state, { type: 'tick' }).score).toBe(0)
  })

  it('restart で初期状態に戻る', () => {
    const state = {
      ...newGame(),
      score: 500,
      lines: 23,
      level: 3,
      over: true,
      paused: true,
      pieceId: 7,
      queue: [] as TetrominoType[],
      bag: [] as TetrominoType[],
      hold: 'T' as TetrominoType,
      holdUsed: true,
    }
    const next = gameReducer(state, { type: 'restart' })
    expect(next.score).toBe(0)
    expect(next.lines).toBe(0)
    expect(next.level).toBe(1)
    expect(next.over).toBe(false)
    expect(next.pieceId).toBe(0)
    expect(next.paused).toBe(false)
    expect(next.hold).toBeNull()
    expect(next.holdUsed).toBe(false)
    expect(next.queue).toHaveLength(QUEUE_SIZE)
    expect(next.queue.length + next.bag.length).toBe(6)
  })
})

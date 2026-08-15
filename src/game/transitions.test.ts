import { describe, expect, it } from 'vitest'
import { emptyBoard } from './board'
import { LOCK_RESET_LIMIT } from './constants'
import { createPiece, shapeFor } from './piece'
import { tetrominoOf } from './tetrominoes'
import {
  hardDrop,
  hold,
  lockNow,
  lockPiece,
  move,
  newGame,
  rotate,
  softDrop,
  step,
  togglePause,
} from './transitions'
import type { GameState, Piece, TetrominoType } from './types'

const square = [
  [1, 1],
  [1, 1],
]

/** テスト用の 2x2 ミノ (O と同じ形なので回転しても位置が変わらない) */
const squarePiece = (x: number, y: number): Piece => ({
  type: 'O',
  shape: square,
  color: '#abc',
  x,
  y,
  rotation: 0,
})

const stateWith = (partial: Partial<GameState>): GameState => ({
  ...newGame(),
  ...partial,
})

/** piece を置き直した state を作る (grounded 等のロックディレイ用フィールドも整える) */
const stateAt = (piece: Piece, partial: Partial<GameState> = {}): GameState => {
  const base = stateWith({ board: emptyBoard(), ...partial })
  return { ...base, piece, lockLowestY: piece.y, grounded: false }
}

describe('lockPiece', () => {
  it('揃った行を消してスコア表どおりに加点し、pieceId を進める', () => {
    const board = emptyBoard()
    for (let x = 0; x < 8; x++) {
      board[18][x] = '#fff'
      board[19][x] = '#fff'
    }
    const state = stateWith({ board, piece: squarePiece(8, 18), score: 0 })
    const next = lockPiece(state)
    // Double = 300 × レベル 1 (PRD #13)
    expect(next.score).toBe(300)
    expect(next.board.flat().every((cell) => cell === null)).toBe(true)
    expect(next.pieceId).toBe(state.pieceId + 1)
  })

  it('消去ライン数を累計に加算し、レベルを再計算する', () => {
    const board = emptyBoard()
    for (let x = 0; x < 8; x++) {
      board[18][x] = '#fff'
      board[19][x] = '#fff'
    }
    // 累計 8 ラインの状態で 2 ライン消すと 10 ライン = レベル 2 に上がる
    const state = stateWith({ board, piece: squarePiece(8, 18), lines: 8, level: 1 })
    const next = lockPiece(state)
    expect(next.lines).toBe(10)
    expect(next.level).toBe(2)
  })

  it('レベル乗算にはライン加算前のレベルを使う', () => {
    const board = emptyBoard()
    for (let x = 0; x < 8; x++) {
      board[18][x] = '#fff'
      board[19][x] = '#fff'
    }
    const state = stateWith({ board, piece: squarePiece(8, 18), lines: 8, level: 1, score: 0 })
    // レベル境界 (8 → 10 ライン) を跨いでもレベル 1 で計算する
    expect(lockPiece(state).score).toBe(300)
  })

  it('消去した行番号を lastClear に載せる (演出用)', () => {
    const board = emptyBoard()
    for (let x = 0; x < 8; x++) {
      board[18][x] = '#fff'
      board[19][x] = '#fff'
    }
    const next = lockPiece(stateWith({ board, piece: squarePiece(8, 18) }))
    expect(next.lastClear).toMatchObject({ rows: [18, 19], cleared: 2, tspin: false, points: 300 })
    expect(next.lastClear?.id).toBe(next.pieceId)
  })

  it('消去がなければ lastClear は null になる', () => {
    const next = lockPiece(stateAt(squarePiece(4, 18)))
    expect(next.lastClear).toBeNull()
  })

  it('ロックで holdUsed が解除される', () => {
    const next = lockPiece(stateWith({ piece: squarePiece(4, 18), holdUsed: true }))
    expect(next.holdUsed).toBe(false)
  })

  it('次のミノがスポーン位置で衝突すると over になる', () => {
    const board = emptyBoard()
    // I はスポーン時 4x4 ボックスの 2 行目に並ぶため、y = 1 の行を埋める
    for (let x = 0; x < 9; x++) {
      board[1][x] = '#fff'
    }
    const state = stateWith({
      board,
      piece: { ...squarePiece(9, 19), shape: [[1]] },
      // 次ミノを I に固定する (x = 3..6, y = 1 で board[1] の埋まったセルと衝突する)
      queue: ['I', 'O', 'T'],
      bag: ['S', 'Z', 'J', 'L'],
    })
    expect(lockPiece(state).over).toBe(true)
  })

  it('次ミノを queue の先頭から取り出し、queue を bag で補充する', () => {
    const state = stateWith({
      board: emptyBoard(),
      piece: squarePiece(0, 18),
      queue: ['O', 'T', 'S'],
      bag: ['Z', 'J'],
    })
    const next = lockPiece(state)
    expect(next.piece.type).toBe('O')
    expect(next.piece.color).toBe(tetrominoOf('O').color)
    expect(next.queue).toEqual(['T', 'S', 'Z'])
    expect(next.bag).toEqual(['J'])
  })
})

describe('T-スピンの判定と加点', () => {
  /**
   * 下向き T が 2 段の窪みにはまり、2 ライン消える形を作る。
   *   ...#......  (y = 17)  ← 3 隅目
   *   ###...####  (y = 18)  ← T の横棒で埋まる
   *   ####.#####  (y = 19)  ← T の突起で埋まる
   */
  const tspinBoard = () => {
    const board = emptyBoard()
    for (let x = 0; x < 10; x++) {
      if (x < 3 || x > 5) board[18][x] = '#fff'
      if (x !== 4) board[19][x] = '#fff'
    }
    board[17][3] = '#fff'
    return board
  }

  const tspinState = (partial: Partial<GameState>) =>
    stateWith({
      board: tspinBoard(),
      piece: { ...createPiece('T'), shape: shapeFor('T', 2), rotation: 2, x: 3, y: 17 },
      score: 0,
      ...partial,
    })

  it('直前の操作が回転なら T-スピンとして T-スピン表で加点する', () => {
    const next = lockPiece(tspinState({ rotatedLast: true, lastKickIndex: 0 }))
    expect(next.lastClear).toMatchObject({ cleared: 2, tspin: true })
    // T-Spin Double = 1200 × レベル 1 (基本ライン表とは加算しない)
    expect(next.score).toBe(1200)
  })

  it('直前の操作が回転でなければ通常のライン表を使う', () => {
    const next = lockPiece(tspinState({ rotatedLast: false }))
    expect(next.lastClear).toMatchObject({ cleared: 2, tspin: false })
    expect(next.score).toBe(300)
  })

  it('回転 → ハードドロップでも T-スピンは成立する', () => {
    const next = hardDrop(tspinState({ rotatedLast: true, lastKickIndex: 0 }))
    expect(next.lastClear?.tspin).toBe(true)
  })
})

describe('newGame', () => {
  it('累計ライン 0 / レベル 1 / ホールド空から始まる', () => {
    const state = newGame()
    expect(state.lines).toBe(0)
    expect(state.level).toBe(1)
    expect(state.hold).toBeNull()
    expect(state.holdUsed).toBe(false)
    expect(state.lastClear).toBeNull()
  })
})

describe('togglePause', () => {
  it('paused をトグルする', () => {
    const state = newGame()
    const paused = togglePause(state)
    expect(paused.paused).toBe(true)
    expect(togglePause(paused).paused).toBe(false)
  })

  it('over 中は同一の state 参照を返す', () => {
    const state = stateWith({ over: true })
    expect(togglePause(state)).toBe(state)
  })
})

describe('paused 中の遷移', () => {
  it('step / move / rotate / hardDrop / hold / lockNow が同一の state 参照を返す', () => {
    const state = stateWith({ paused: true, grounded: true })
    expect(step(state)).toBe(state)
    expect(move(state, 1)).toBe(state)
    expect(rotate(state)).toBe(state)
    expect(hardDrop(state)).toBe(state)
    expect(hold(state)).toBe(state)
    expect(lockNow(state)).toBe(state)
  })
})

describe('hardDrop', () => {
  it('現在のミノを最下段まで進めて固定する', () => {
    const state = stateAt(squarePiece(4, 0))
    const next = hardDrop(state)
    expect(next.board[18][4]).toBe('#abc')
    expect(next.board[19][5]).toBe('#abc')
    expect(next.pieceId).toBe(state.pieceId + 1)
  })

  it('落下セル数 × 2 点を加算し、演出用の hardDropId を進める', () => {
    const state = stateAt(squarePiece(4, 0), { score: 0 })
    const next = hardDrop(state)
    // y = 0 → 18 の 18 セル ×2
    expect(next.score).toBe(36)
    expect(next.hardDropId).toBe(state.hardDropId + 1)
  })
})

describe('step / softDrop', () => {
  it('over 状態では同一の state 参照を返す', () => {
    const state = stateWith({ over: true })
    expect(step(state)).toBe(state)
    expect(softDrop(state)).toBe(state)
  })

  it('接地していても step では固定しない (ロックディレイに委ねる)', () => {
    const state = stateAt(squarePiece(4, 18))
    const next = step(state)
    expect(next.pieceId).toBe(state.pieceId)
    expect(next.piece.y).toBe(18)
    expect(next.grounded).toBe(true)
    // 固定はロックディレイ満了 (lockNow) のときだけ
    expect(lockNow(next).pieceId).toBe(state.pieceId + 1)
  })

  it('softDrop は 1 段落として +1 点', () => {
    const state = stateAt(squarePiece(4, 0), { score: 0 })
    const next = softDrop(state)
    expect(next.piece.y).toBe(1)
    expect(next.score).toBe(1)
  })

  it('接地中の softDrop は加点も移動もしない', () => {
    const state = stateAt(squarePiece(4, 18), { score: 7 })
    const next = softDrop(state)
    expect(next.piece.y).toBe(18)
    expect(next.score).toBe(7)
  })
})

describe('ロックディレイ', () => {
  it('接地すると grounded が立ち、lockKey が進む (タイマー起動の合図)', () => {
    const state = stateAt(squarePiece(4, 17))
    const next = step(state)
    expect(next.grounded).toBe(true)
    expect(next.lockKey).toBe(state.lockKey + 1)
  })

  it('接地中の移動でタイマーを張り直す (lockKey が進む)', () => {
    const grounded = step(stateAt(squarePiece(4, 17)))
    const moved = move(grounded, 1)
    expect(moved.lockKey).toBe(grounded.lockKey + 1)
    expect(moved.lockResets).toBe(grounded.lockResets + 1)
  })

  it('再始動が上限に達すると lockKey が進まなくなる (無限ロック回避)', () => {
    let state = step(stateAt(squarePiece(4, 17)))
    for (let i = 0; i < LOCK_RESET_LIMIT * 2; i++) {
      state = move(state, i % 2 === 0 ? 1 : -1)
    }
    expect(state.lockResets).toBe(LOCK_RESET_LIMIT)
    const before = state.lockKey
    expect(move(state, 1).lockKey).toBe(before)
  })

  it('一段落ちると再始動回数がリセットされる', () => {
    const board = emptyBoard()
    board[19][4] = '#fff'
    // 段差の上 (y = 17) で接地して何度か動かし、段差を降りて y = 18 まで落ちると戻る
    let state = step({ ...stateAt(squarePiece(4, 17)), board })
    expect(state.grounded).toBe(true)
    state = move(state, -1)
    state = move(state, 1)
    expect(state.lockResets).toBeGreaterThan(1)
    // 空いている列へ移ってから落下
    state = move(state, 2)
    expect(state.grounded).toBe(false)
    state = step(state)
    expect(state.piece.y).toBe(18)
    expect(state.lockResets).toBe(1)
  })

  it('lockNow は接地していなければ何もしない', () => {
    const state = stateAt(squarePiece(4, 0))
    expect(lockNow(state)).toBe(state)
  })
})

describe('hold', () => {
  it('枠が空のときはネクストキューの先頭を消費して交換する (独立生成しない)', () => {
    const state = stateWith({
      piece: createPiece('T'),
      queue: ['O', 'S', 'Z'],
      bag: ['I', 'J'],
    })
    const next = hold(state)
    expect(next.hold).toBe('T')
    expect(next.piece.type).toBe('O')
    expect(next.queue).toEqual(['S', 'Z', 'I'])
    expect(next.bag).toEqual(['J'])
    expect(next.holdUsed).toBe(true)
  })

  it('枠にミノがあれば交換し、キューは進めない', () => {
    const state = stateWith({
      piece: createPiece('T'),
      hold: 'L',
      queue: ['O', 'S', 'Z'],
      bag: ['I', 'J'],
    })
    const next = hold(state)
    expect(next.hold).toBe('T')
    expect(next.piece.type).toBe('L')
    expect(next.queue).toEqual(['O', 'S', 'Z'])
    expect(next.bag).toEqual(['I', 'J'])
  })

  it('交換したミノはスポーン位置に戻る', () => {
    const state = stateWith({
      piece: { ...createPiece('T'), x: 0, y: 15, rotation: 2 },
      hold: 'L',
    })
    const next = hold(state)
    expect(next.piece).toMatchObject(createPiece('L'))
  })

  it('同一ミノでの連続ホールドはできない', () => {
    const once = hold(stateWith({ piece: createPiece('T') }))
    expect(hold(once)).toBe(once)
  })

  it('ホールドで世代 (pieceId) が進む', () => {
    const state = stateWith({ piece: createPiece('T') })
    expect(hold(state).pieceId).toBe(state.pieceId + 1)
  })

  it('交換したミノがスポーン位置で衝突すると over になる', () => {
    const board = emptyBoard()
    for (let x = 0; x < 10; x++) {
      board[0][x] = '#fff'
      board[1][x] = '#fff'
    }
    const state = stateWith({ board, piece: createPiece('T'), hold: 'L' as TetrominoType })
    expect(hold(state).over).toBe(true)
  })
})

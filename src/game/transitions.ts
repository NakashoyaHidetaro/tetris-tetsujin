import { draw, initialQueue } from './bag'
import { collides, dropY, emptyBoard } from './board'
import { COLS, LOCK_RESET_LIMIT, ROWS, levelForLines } from './constants'
import { createPiece } from './piece'
import { randomSeed } from './rng'
import { scoreForClear, scoreForHardDrop, scoreForSoftDrop } from './scoring'
import { tryRotate } from './srs'
import { detectTSpin } from './tspin'
import type { Cell, GameState, Piece, RotationDir } from './types'

/**
 * 新規ゲーム。seed を明示すればミノ出現列は完全に再現される (PRD #18 リプレイ)。
 * 省略時は毎回ランダムなシードを引く (従来どおりの挙動)
 */
export const newGame = (seed: number = randomSeed()): GameState => {
  const start = initialQueue(seed)
  const { type, queue, bag, seed: nextSeed } = draw(start.queue, start.bag, start.seed)
  const piece = createPiece(type)
  return {
    board: emptyBoard(),
    piece,
    pieceId: 0,
    initialSeed: seed,
    seed: nextSeed,
    score: 0,
    lines: 0,
    level: levelForLines(0),
    over: false,
    paused: false,
    queue,
    bag,
    hold: null,
    holdUsed: false,
    grounded: false,
    lockResets: 0,
    lockLowestY: piece.y,
    lockKey: 0,
    rotatedLast: false,
    lastKickIndex: -1,
    lastClear: null,
    hardDropId: 0,
  }
}

/**
 * 現在ミノを動かした結果を state に反映する。ロックディレイの管理はここに集約する:
 *
 * - 接地判定 (grounded) を毎回引き直す
 * - これまでで最も低い y を更新したとき (= 一段落ちたとき) だけ再始動回数を 0 に戻す
 * - 接地中で上限未満なら lockKey を進めてタイマーを張り直す (上限に達したら据え置き
 *   = 最後の再始動から満了までのカウントがそのまま進み、無限ロックにならない)
 */
const applyPiece = (
  state: GameState,
  piece: Piece,
  rotated: boolean,
  kickIndex = -1,
): GameState => {
  const grounded = collides(state.board, piece.shape, piece.x, piece.y + 1)
  let { lockResets, lockLowestY, lockKey } = state
  if (piece.y > lockLowestY) {
    lockResets = 0
    lockLowestY = piece.y
  }
  if (grounded && lockResets < LOCK_RESET_LIMIT) {
    lockResets += 1
    lockKey += 1
  }
  return {
    ...state,
    piece,
    grounded,
    lockResets,
    lockLowestY,
    lockKey,
    rotatedLast: rotated,
    lastKickIndex: kickIndex,
  }
}

/** 次のミノをスポーンさせる (ロック後・ホールド後で共通) */
const spawn = (state: GameState, piece: Piece): Partial<GameState> => {
  const over = collides(state.board, piece.shape, piece.x, piece.y)
  return {
    piece,
    over,
    grounded: !over && collides(state.board, piece.shape, piece.x, piece.y + 1),
    lockResets: 0,
    lockLowestY: piece.y,
    lockKey: state.lockKey + 1,
    rotatedLast: false,
    lastKickIndex: -1,
  }
}

export const lockPiece = (state: GameState): GameState => {
  const { piece } = state
  // T-スピン判定はミノを書き込む前の盤面で行う (3x3 の 4 隅は T 自身とは重ならない)。
  // 「直前の成功操作が回転 (キック成立を含む)」が条件 (PRD #12)
  const kind = state.rotatedLast ? detectTSpin(state.board, piece, state.lastKickIndex) : 'none'
  const tspin = kind === 'tspin'

  const board = state.board.map((row) => [...row])
  piece.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v && piece.y + dy >= 0) {
        board[piece.y + dy][piece.x + dx] = piece.color
      }
    }),
  )

  const rows: number[] = []
  board.forEach((row, y) => {
    if (row.every((cell) => cell !== null)) rows.push(y)
  })
  const cleared = rows.length
  const remaining = board.filter((row) => row.some((cell) => cell === null))
  while (remaining.length < ROWS) {
    remaining.unshift(Array<Cell>(COLS).fill(null))
  }

  // レベル乗算にはライン加算・レベル更新の「前」のレベルを使う (PRD #13)
  const points = scoreForClear(cleared, state.level, tspin)
  const { type, queue, bag, seed } = draw(state.queue, state.bag, state.seed)
  const lines = state.lines + cleared
  const pieceId = state.pieceId + 1
  const next: GameState = {
    ...state,
    board: remaining,
    pieceId,
    score: state.score + points,
    lines,
    level: levelForLines(lines),
    queue,
    bag,
    seed,
    holdUsed: false,
    lastClear: cleared > 0 ? { id: pieceId, rows, cleared, tspin, points } : null,
  }
  return { ...next, ...spawn(next, createPiece(type)) }
}

/** over / paused 中は操作を受け付けない (同一参照を返して再レンダリングを避ける) */
const halted = (state: GameState): boolean => state.over || state.paused

/**
 * 重力による 1 段落下。接地中は固定せず、ロックディレイの満了 (lockNow) に委ねる
 */
export const step = (state: GameState): GameState => {
  if (halted(state)) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x, piece.y + 1)) {
    // 接地済みなら何もしない。まだ grounded が立っていなければここで立てて
    // ロックディレイのタイマーを起動させる (接地の取りこぼし防止)
    return state.grounded ? state : applyPiece(state, piece, state.rotatedLast, state.lastKickIndex)
  }
  return applyPiece(state, { ...piece, y: piece.y + 1 }, false)
}

/** ソフトドロップ: 1 段落として +1 点 (PRD #13)。接地中は何もしない */
export const softDrop = (state: GameState): GameState => {
  const next = step(state)
  // 実際に 1 段落ちたときだけ加点する (接地確定だけの遷移では加点しない)
  if (next.piece.y === state.piece.y) return next
  return { ...next, score: next.score + scoreForSoftDrop(1) }
}

/** ロックディレイ満了。接地していなければ何もしない */
export const lockNow = (state: GameState): GameState =>
  halted(state) || !state.grounded ? state : lockPiece(state)

export const move = (state: GameState, dx: number): GameState => {
  if (halted(state)) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x + dx, piece.y)) return state
  return applyPiece(state, { ...piece, x: piece.x + dx }, false)
}

/** SRS 壁キック付きの回転 (PRD #12)。回転できなければ同一参照を返す */
export const rotate = (state: GameState, dir: RotationDir = 'cw'): GameState => {
  if (halted(state)) return state
  const result = tryRotate(state.board, state.piece, dir)
  if (!result) return state
  return applyPiece(state, result.piece, true, result.kickIndex)
}

/** ハードドロップ: 即時固定でロックディレイを適用しない (PRD #12)。落下セル数 ×2 点 */
export const hardDrop = (state: GameState): GameState => {
  if (halted(state)) return state
  const y = dropY(state.board, state.piece)
  const cells = y - state.piece.y
  const dropped: GameState = {
    ...state,
    piece: { ...state.piece, y },
    score: state.score + scoreForHardDrop(cells),
    // 落として固定するだけなので「直前の操作が回転」の状態は維持する
    // (回転 → ハードドロップの T-スピンはガイドライン上も成立する)
  }
  return { ...lockPiece(dropped), hardDropId: state.hardDropId + 1 }
}

/**
 * ホールド (PRD #6)。枠が空のときはネクストキューの先頭を消費する (独立生成しない)。
 * 同一ミノの連続ホールドは次のロックまで不可
 */
export const hold = (state: GameState): GameState => {
  if (halted(state) || state.holdUsed) return state
  const current = state.piece.type
  const held = state.hold
  const swapped: GameState = { ...state, hold: current, holdUsed: true, pieceId: state.pieceId + 1 }
  if (held === null) {
    const { type, queue, bag, seed } = draw(state.queue, state.bag, state.seed)
    const next: GameState = { ...swapped, queue, bag, seed }
    return { ...next, ...spawn(next, createPiece(type)) }
  }
  return { ...swapped, ...spawn(swapped, createPiece(held)) }
}

/** ポーズの切り替え。over 中は無視して同一参照を返す */
export const togglePause = (state: GameState): GameState =>
  state.over ? state : { ...state, paused: !state.paused }

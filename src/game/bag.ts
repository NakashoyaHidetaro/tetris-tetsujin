import { nextInt, randomSeed } from './rng'
import { TETROMINO_TYPES } from './tetrominoes'
import type { TetrominoType } from './types'

/** UI がプレビュー表示するネクストの手数。queue は常にこの数を保つ */
export const QUEUE_SIZE = 3

export interface Shuffled<T> {
  result: T[]
  /** 消費後の乱数状態 */
  seed: number
}

/**
 * Fisher–Yates シャッフル (非破壊)。
 * 乱数の呼び出しはこの関数だけに閉じており、乱数源はシード (32bit 状態) として
 * 引数で受け渡す。これによりミノ出現列は seed だけで完全に再現でき、
 * リプレイ (#18) が成立する。
 */
export const shuffle = <T>(items: readonly T[], seed: number): Shuffled<T> => {
  const result = [...items]
  let state = seed
  for (let i = result.length - 1; i > 0; i--) {
    const next = nextInt(state, i + 1)
    state = next.state
    const j = next.value
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return { result, seed: state }
}

/** 7 種各 1 個を含む新しい bag を生成する */
export const newBag = (seed: number): Shuffled<TetrominoType> => shuffle(TETROMINO_TYPES, seed)

export interface Queue {
  queue: TetrominoType[]
  bag: TetrominoType[]
  /** 消費後の乱数状態 */
  seed: number
}

/** queue が QUEUE_SIZE 個になるまで bag から補充する (bag が尽きたら次の bag を生成) */
export const refill = (
  queue: readonly TetrominoType[],
  bag: readonly TetrominoType[],
  seed: number,
): Queue => {
  const nextQueue = [...queue]
  let nextBag = [...bag]
  let state = seed
  while (nextQueue.length < QUEUE_SIZE) {
    if (nextBag.length === 0) {
      const generated = newBag(state)
      nextBag = generated.result
      state = generated.seed
    }
    nextQueue.push(nextBag.shift() as TetrominoType)
  }
  return { queue: nextQueue, bag: nextBag, seed: state }
}

/** 空の状態から queue / bag を初期化する */
export const initialQueue = (seed: number = randomSeed()): Queue => refill([], [], seed)

export interface Draw extends Queue {
  type: TetrominoType
}

/** queue の先頭を取り出し、bag から補充した queue / bag とともに返す */
export const draw = (
  queue: readonly TetrominoType[],
  bag: readonly TetrominoType[],
  seed: number,
): Draw => {
  const [head, ...rest] = queue
  const filled = refill(rest, bag, seed)
  return { type: head, ...filled }
}

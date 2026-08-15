import { TETROMINO_TYPES } from './tetrominoes'
import type { TetrominoType } from './types'

/** UI がプレビュー表示するネクストの手数。queue は常にこの数を保つ */
export const QUEUE_SIZE = 3

/**
 * Fisher–Yates シャッフル (非破壊)。
 * 乱数の呼び出しはこの関数だけに閉じているため、将来のリプレイ機能 (#18) では
 * ここへシード付き乱数を注入するだけでゲーム全体を再現できる。
 */
export const shuffle = <T>(items: readonly T[]): T[] => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 7 種各 1 個を含む新しい bag を生成する */
export const newBag = (): TetrominoType[] => shuffle(TETROMINO_TYPES)

export interface Queue {
  queue: TetrominoType[]
  bag: TetrominoType[]
}

/** queue が QUEUE_SIZE 個になるまで bag から補充する (bag が尽きたら次の bag を生成) */
export const refill = (queue: readonly TetrominoType[], bag: readonly TetrominoType[]): Queue => {
  const nextQueue = [...queue]
  let nextBag = [...bag]
  while (nextQueue.length < QUEUE_SIZE) {
    if (nextBag.length === 0) nextBag = newBag()
    nextQueue.push(nextBag.shift() as TetrominoType)
  }
  return { queue: nextQueue, bag: nextBag }
}

/** 空の状態から queue / bag を初期化する */
export const initialQueue = (): Queue => refill([], [])

export interface Draw extends Queue {
  type: TetrominoType
}

/** queue の先頭を取り出し、bag から補充した queue / bag とともに返す */
export const draw = (queue: readonly TetrominoType[], bag: readonly TetrominoType[]): Draw => {
  const [head, ...rest] = queue
  const filled = refill(rest, bag)
  return { type: head, ...filled }
}

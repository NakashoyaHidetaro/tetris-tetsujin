import { composeDisplay } from '../game/board'
import type { Board as BoardState, Piece } from '../game/types'
import { Cell } from './Cell'
import { PauseOverlay } from './PauseOverlay'
import './board.css'

export function Board({
  board,
  piece,
  over,
  paused = false,
}: {
  board: BoardState
  piece: Piece
  over: boolean
  /** ポーズ中は盤面を隠さず、上に PAUSED ラベルだけ重ねる (PRD #4) */
  paused?: boolean
}) {
  // ゲームオーバー時はスポーン位置で衝突しているミノ (とゴースト) を描画しない
  const display = composeDisplay(board, over ? null : piece)
  return (
    <div className={over ? 'board-wrap over' : 'board-wrap'}>
      <div className="board">
        {display.flatMap((row, y) =>
          row.map((cell, x) => <Cell key={`${y}-${x}`} color={cell.color} ghost={cell.ghost} />),
        )}
      </div>
      {paused && !over && <PauseOverlay />}
    </div>
  )
}

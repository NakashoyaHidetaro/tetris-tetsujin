import { composeDisplay } from '../game/board'
import type { Board as BoardState, Piece } from '../game/types'
import { Cell } from './Cell'
import './board.css'

export function Board({
  board,
  piece,
  over,
}: {
  board: BoardState
  piece: Piece
  over: boolean
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
    </div>
  )
}

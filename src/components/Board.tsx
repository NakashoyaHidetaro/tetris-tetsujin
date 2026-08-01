import { composeDisplay } from '../game/board'
import type { Board as BoardState, Piece } from '../game/types'
import { Cell } from './Cell'
import './board.css'

export function Board({ board, piece }: { board: BoardState; piece: Piece }) {
  const display = composeDisplay(board, piece)
  return (
    <div className="board">
      {display.flatMap((row, y) =>
        row.map((color, x) => <Cell key={`${y}-${x}`} color={color} />),
      )}
    </div>
  )
}

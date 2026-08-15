import { hardDrop, move, newGame, rotate, step, togglePause } from './transitions'
import type { GameAction, GameState } from './types'

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'tick':
    case 'softDrop':
      return step(state)
    case 'move':
      return move(state, action.dx)
    case 'rotate':
      return rotate(state)
    case 'hardDrop':
      // ハードドロップは不可逆のため、入力時点の pieceId と世代が一致する場合のみ
      // 適用する (ロック境界をまたいだ入力が次ミノへ誤適用されるのを防ぐ)
      return state.pieceId === action.pieceId ? hardDrop(state) : state
    case 'togglePause':
      return togglePause(state)
    case 'restart':
      return newGame()
  }
}

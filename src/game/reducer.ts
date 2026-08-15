import {
  hardDrop,
  hold,
  lockNow,
  move,
  newGame,
  rotate,
  softDrop,
  step,
  togglePause,
} from './transitions'
import type { GameAction, GameState } from './types'

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'tick':
      return step(state)
    case 'softDrop':
      return softDrop(state)
    case 'move':
      return move(state, action.dx)
    case 'rotate':
      return rotate(state, action.dir)
    case 'hardDrop':
      // ハードドロップは不可逆のため、入力時点の pieceId と世代が一致する場合のみ
      // 適用する (ロック境界をまたいだ入力が次ミノへ誤適用されるのを防ぐ)
      return state.pieceId === action.pieceId ? hardDrop(state) : state
    case 'lock':
      // ロックディレイ満了。タイマー発火時点で世代が進んでいたら破棄する
      return state.pieceId === action.pieceId ? lockNow(state) : state
    case 'hold':
      return hold(state)
    case 'togglePause':
      return togglePause(state)
    case 'restart':
      return newGame(action.seed)
  }
}

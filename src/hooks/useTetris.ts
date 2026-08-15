import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { DROP_MS } from '../game/constants'
import { gameReducer } from '../game/reducer'
import { loadBest, saveBest } from '../game/storage'
import { newGame } from '../game/transitions'
import type { GameAction } from '../game/types'

export const useTetris = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, newGame)
  const [best, setBest] = useState(loadBest)
  const stateRef = useRef(state)

  // useLayoutEffect で commit と同一タスク内に ref を同期する: paint 後に届く
  // keydown が常に最新の pieceId を見るため、描画済みの新ミノへの正当な
  // ハードドロップが世代不一致で無視される窓が生じない
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  // ゲームオーバーへ遷移した時点でベスト更新を判定する。over 中は score が
  // 変化しないため、StrictMode の effect 二重実行や再レンダリングで複数回走っても
  // saveBest は同じ値の上書き (冪等) にしかならない
  useEffect(() => {
    if (!state.over || state.score <= best) return
    saveBest(state.score)
    setBest(state.score)
  }, [state.over, state.score, best])

  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: 'tick' }), DROP_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        // ゲームオーバー中は preventDefault せずボタンのネイティブ Space
        // activation (フォーカスした Restart の押下) に委ねる
        if (stateRef.current.over) return
        e.preventDefault()
        if (e.repeat) return
        dispatch({ type: 'hardDrop', pieceId: stateRef.current.pieceId })
        return
      }
      const actions: Record<string, GameAction> = {
        ArrowLeft: { type: 'move', dx: -1 },
        ArrowRight: { type: 'move', dx: 1 },
        ArrowDown: { type: 'softDrop' },
        ArrowUp: { type: 'rotate' },
      }
      const action = actions[e.key]
      if (action) {
        e.preventDefault()
        dispatch(action)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return { state, best, restart: () => dispatch({ type: 'restart' }) }
}

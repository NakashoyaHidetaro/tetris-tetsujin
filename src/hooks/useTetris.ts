import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { DROP_MS } from '../game/constants'
import { gameReducer } from '../game/reducer'
import type { RankingEntry } from '../game/storage'
import { loadRanking, saveScore } from '../game/storage'
import { newGame } from '../game/transitions'
import type { GameAction } from '../game/types'

export const useTetris = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, newGame)
  const [ranking, setRanking] = useState<RankingEntry[]>(loadRanking)
  const [lastRank, setLastRank] = useState<number | null>(null)
  // 1 ゲームにつき saveScore を厳密に 1 回だけ呼ぶためのガード。
  // StrictMode の effect 二重実行や再レンダリングでも重複登録されない
  const savedRef = useRef(false)
  const stateRef = useRef(state)

  // useLayoutEffect で commit と同一タスク内に ref を同期する: paint 後に届く
  // keydown が常に最新の pieceId を見るため、描画済みの新ミノへの正当な
  // ハードドロップが世代不一致で無視される窓が生じない
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  // ゲームオーバーへ遷移した瞬間にスコアをランキングへ 1 回だけ登録する。
  // saveScore は冪等ではない (同じスコアが何件も積まれる) ため、savedRef で
  // 多重呼び出しを防ぎ、restart (over が false に戻る) でフラグを戻す
  useEffect(() => {
    if (!state.over) {
      savedRef.current = false
      return
    }
    if (savedRef.current) return
    savedRef.current = true
    const { ranking: next, rank } = saveScore(state.score)
    setRanking(next)
    setLastRank(rank)
  }, [state.over, state.score])

  // ポーズ中はタイマー自体を止める。reducer も tick を無視するので二重の
  // 防御だが、将来レベルごとに間隔を変える (#3) 際に依存配列を足すだけで
  // 済む形にしておく
  useEffect(() => {
    if (state.paused) return
    const timer = setInterval(() => dispatch({ type: 'tick' }), DROP_MS)
    return () => clearInterval(timer)
  }, [state.paused])

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
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        // ゲームオーバー中はポーズできない (reducer 側でも無視される)
        if (stateRef.current.over) return
        e.preventDefault()
        if (e.repeat) return
        dispatch({ type: 'togglePause' })
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

  // best は ScorePanel の BEST 表示用 (ランキング 1 位 = 従来のベストスコア)
  return {
    state,
    best: ranking[0]?.score ?? 0,
    ranking,
    lastRank,
    restart: () => dispatch({ type: 'restart' }),
  }
}

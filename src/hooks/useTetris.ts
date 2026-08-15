import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { LOCK_DELAY_MS, dropInterval } from '../game/constants'
import { gameReducer } from '../game/reducer'
import type { RankingEntry } from '../game/storage'
import { loadRanking, saveScore } from '../game/storage'
import { newGame } from '../game/transitions'
import type { GameAction, RotationDir } from '../game/types'

export interface UseTetrisOptions {
  /**
   * 手動のプレイ操作 (移動・回転・ドロップ・ホールド) が入力されたときに呼ばれる。
   * 自動プレイの解除に使う。ポーズは「プレイ操作」ではないので通知しない
   */
  onManualInput?: () => void
}

export const useTetris = ({ onManualInput }: UseTetrisOptions = {}) => {
  const [state, dispatch] = useReducer(gameReducer, undefined, newGame)
  const [ranking, setRanking] = useState<RankingEntry[]>(loadRanking)
  const [lastRank, setLastRank] = useState<number | null>(null)
  // 1 ゲームにつき saveScore を厳密に 1 回だけ呼ぶためのガード。
  // StrictMode の effect 二重実行や再レンダリングでも重複登録されない
  const savedRef = useRef(false)
  const stateRef = useRef(state)
  // keydown ハンドラを張り直さずに最新のコールバックを見るための箱
  const manualRef = useRef(onManualInput)
  manualRef.current = onManualInput

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

  // ポーズ中はタイマー自体を止める。reducer も tick を無視するので二重の防御。
  // level を依存に含めることで、レベルが変わった瞬間に interval を張り直し、
  // 新しい落下間隔が即時に反映される (PRD #3)
  useEffect(() => {
    if (state.paused || state.over) return
    const timer = setInterval(() => dispatch({ type: 'tick' }), dropInterval(state.level))
    return () => clearInterval(timer)
  }, [state.paused, state.over, state.level])

  // ロックディレイ (PRD #12)。接地している間だけタイマーを張り、満了で固定する。
  // 「いつ張り直すか」はゲームロジック層が lockKey で指示する (接地・接地中の
  // 移動/回転で +1。再始動上限に達すると据え置かれるので無限ロックにならない)。
  // ポーズ中はゲームタイマー全般を止める要件 (PRD #4) に従い張らない
  useEffect(() => {
    if (!state.grounded || state.paused || state.over) return
    const pieceId = state.pieceId
    const timer = setTimeout(() => dispatch({ type: 'lock', pieceId }), LOCK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.grounded, state.lockKey, state.pieceId, state.paused, state.over])

  // キーハンドラとタッチ操作 (PRD #16) で同じ dispatch を共有するための操作関数群。
  // dispatch は安定なので、これらの参照も再レンダリングをまたいで変わらない
  const send = useCallback((action: GameAction) => dispatch(action), [])
  const moveLeft = useCallback(() => send({ type: 'move', dx: -1 }), [send])
  const moveRight = useCallback(() => send({ type: 'move', dx: 1 }), [send])
  const rotate = useCallback(
    (dir: RotationDir = 'cw') => send({ type: 'rotate', dir }),
    [send],
  )
  const softDrop = useCallback(() => send({ type: 'softDrop' }), [send])
  // ハードドロップだけは不可逆なので、押下時点の世代 (pieceId) を添えて送る
  const hardDrop = useCallback(
    () => send({ type: 'hardDrop', pieceId: stateRef.current.pieceId }),
    [send],
  )
  const hold = useCallback(() => send({ type: 'hold' }), [send])
  const togglePause = useCallback(() => send({ type: 'togglePause' }), [send])
  const restart = useCallback(() => send({ type: 'restart' }), [send])

  const controls = useMemo(
    () => ({ moveLeft, moveRight, rotate, softDrop, hardDrop, hold, togglePause, restart }),
    [moveLeft, moveRight, rotate, softDrop, hardDrop, hold, togglePause, restart],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 実際に操作が成立したときだけ通知する (未割り当てキーでは呼ばない)
      const manual = () => manualRef.current?.()
      if (e.key === ' ') {
        // ゲームオーバー中は preventDefault せずボタンのネイティブ Space
        // activation (フォーカスした Restart の押下) に委ねる
        if (stateRef.current.over) return
        e.preventDefault()
        if (e.repeat) return
        manual()
        hardDrop()
        return
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        // ゲームオーバー中はポーズできない (reducer 側でも無視される)
        if (stateRef.current.over) return
        e.preventDefault()
        if (e.repeat) return
        togglePause()
        return
      }
      // ホールドは 1 ミノ 1 回なのでキーリピートは無視する (PRD #6)
      if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
        if (stateRef.current.over) return
        e.preventDefault()
        if (e.repeat) return
        manual()
        hold()
        return
      }
      const actions: Record<string, () => void> = {
        ArrowLeft: moveLeft,
        ArrowRight: moveRight,
        ArrowDown: softDrop,
        ArrowUp: () => rotate('cw'),
        x: () => rotate('cw'),
        X: () => rotate('cw'),
        z: () => rotate('ccw'),
        Z: () => rotate('ccw'),
      }
      const run = actions[e.key]
      if (run) {
        e.preventDefault()
        manual()
        run()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moveLeft, moveRight, rotate, softDrop, hardDrop, hold, togglePause])

  // best は ScorePanel の BEST 表示用 (ランキング 1 位 = 従来のベストスコア)
  return {
    state,
    best: ranking[0]?.score ?? 0,
    ranking,
    lastRank,
    controls,
    moveLeft,
    moveRight,
    rotate,
    softDrop,
    hardDrop,
    hold,
    togglePause,
    restart,
  }
}

import { useEffect, useRef } from 'react'
import { bestPlacement } from '../game/ai'
import type { GameState, RotationDir } from '../game/types'

/** 自動プレイが 1 操作を送る間隔 (ms)。人が操作しているように見える速さにする */
export const AUTO_STEP_MS = 150

/**
 * 自動プレイが使う操作関数。useTetris の controls がそのまま渡せる形にしてある。
 * ハードドロップは世代チェック付きなので、必ず controls 経由のものを受け取る
 */
export interface AutoPlayControls {
  moveLeft: () => void
  moveRight: () => void
  rotate: (dir?: RotationDir) => void
  hardDrop: () => void
}

/** 現在のミノに対する行動計画。pieceId が変わったら破棄して立て直す */
interface Plan {
  /** この計画が対象とするミノの世代 */
  pieceId: number
  /** 残りの回転回数 (cw)。O ミノのように回転しても状態が変わらないミノがあるため、
   *  「目標 rotation と一致するまで回す」ではなく最初に決めた回数だけ送る */
  rotations: number
  /** 目標の x (ミノの左上 x) */
  targetX: number
  /** 直前の tick 時点の x。動かせているかの判定に使う */
  lastX: number
  /** x が変化しないまま横移動を送った回数 (壁・積み山でつかえた検知) */
  stalls: number
}

/**
 * 自動プレイ (AI) フック。
 *
 * ミノが出現するたびに bestPlacement で目標 (rotation, x) を 1 回だけ計算して
 * キャッシュし、以降は AUTO_STEP_MS ごとに「回転 → 横移動 1 マス → ハードドロップ」
 * を 1 操作ずつ送る。まとめて送らないのは、人がプレイしているように見せるため。
 *
 * ゲーム状態は一切書き換えず、キーボード/タッチと同じ controls を通すだけなので、
 * ロックディレイや T-スピン判定などのゲームロジックはそのまま働く
 */
export function useAutoPlay(state: GameState, controls: AutoPlayControls, enabled: boolean) {
  // interval を張り直さずに最新の状態・操作関数を見るための箱
  const stateRef = useRef(state)
  const controlsRef = useRef(controls)
  const planRef = useRef<Plan | null>(null)

  stateRef.current = state
  controlsRef.current = controls

  // OFF にしたら計画を捨てる (再度 ON にしたとき古い目標へ動き出さない)
  useEffect(() => {
    if (!enabled) planRef.current = null
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const step = () => {
      const s = stateRef.current
      // ポーズ中・ゲームオーバー中は何もしない (自動リスタートもしない)
      if (s.paused || s.over) return

      const { moveLeft, moveRight, rotate, hardDrop } = controlsRef.current

      let plan = planRef.current
      if (!plan || plan.pieceId !== s.pieceId) {
        const target = bestPlacement(s.board, s.piece)
        plan = {
          pieceId: s.pieceId,
          // 置き場所が見つからない (詰み) ときは、その場で落として次へ進む
          rotations: target ? (target.rotation - s.piece.rotation + 4) % 4 : 0,
          targetX: target ? target.x : s.piece.x,
          lastX: s.piece.x,
          stalls: 0,
        }
        planRef.current = plan
      }

      if (plan.rotations > 0) {
        plan.rotations -= 1
        plan.lastX = s.piece.x
        rotate('cw')
        return
      }

      const dx = plan.targetX - s.piece.x
      if (dx !== 0) {
        // 前回と x が同じ = 壁やブロックで動けていない。数回続いたら諦めて落とす
        plan.stalls = plan.lastX === s.piece.x ? plan.stalls + 1 : 0
        plan.lastX = s.piece.x
        if (plan.stalls >= 2) {
          hardDrop()
          return
        }
        if (dx < 0) moveLeft()
        else moveRight()
        return
      }

      hardDrop()
    }

    const timer = setInterval(step, AUTO_STEP_MS)
    return () => clearInterval(timer)
  }, [enabled])
}

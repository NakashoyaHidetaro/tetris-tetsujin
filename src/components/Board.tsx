import { useEffect, useState } from 'react'
import { composeDisplay } from '../game/board'
import type { Board as BoardState, ClearInfo, Piece } from '../game/types'
import { Cell } from './Cell'
import { PauseOverlay } from './PauseOverlay'
import { useBoardGestures, type BoardGestureHandlers } from './boardGestures'
import './board.css'

/** ライン消去フラッシュの表示時間 (ms)。board.css の .clear-flash-row と揃える */
const CLEAR_FLASH_MS = 380
/** ハードドロップ着地演出の表示時間 (ms)。board.css の .drop-impact と揃える */
const DROP_IMPACT_MS = 220

export function Board({
  board,
  piece,
  over,
  paused = false,
  clear = null,
  hardDropId = 0,
  onMoveLeft,
  onMoveRight,
  onRotate,
  onSoftDrop,
  onHardDrop,
}: {
  board: BoardState
  piece: Piece
  over: boolean
  /** ポーズ中は盤面を隠さず、上に PAUSED ラベルだけ重ねる (PRD #4) */
  paused?: boolean
  /** 直近のライン消去情報 (PRD #7 の演出用)。盤面自体はすでに消去後の状態 */
  clear?: ClearInfo | null
  /** ハードドロップの通し番号。増えるたびに着地演出を 1 回再生する (PRD #7) */
  hardDropId?: number
} & BoardGestureHandlers) {
  // 演出は「表示レイヤーだけの一時状態」として持つ。ゲーム状態 (盤面・スコア・
  // 次ミノ) は消去と同時に更新済みなので、演出が進行を止めることはない (PRD #7)
  const [flash, setFlash] = useState<ClearInfo | null>(null)
  const [impact, setImpact] = useState(0)

  useEffect(() => {
    if (!clear) return
    setFlash(clear)
    const timer = setTimeout(() => setFlash(null), CLEAR_FLASH_MS)
    return () => clearTimeout(timer)
  }, [clear])

  useEffect(() => {
    if (!hardDropId) return
    setImpact(hardDropId)
    const timer = setTimeout(() => setImpact(0), DROP_IMPACT_MS)
    return () => clearTimeout(timer)
  }, [hardDropId])

  // 盤面上のスワイプ / タップ操作 (PRD #16)。
  // 操作コールバックが 1 つも渡されなければハンドラは付かず、従来どおりの表示専用になる
  const gestures = useBoardGestures(
    { onMoveLeft, onMoveRight, onRotate, onSoftDrop, onHardDrop },
    { enabled: !over && !paused },
  )

  // ゲームオーバー時はスポーン位置で衝突しているミノ (とゴースト) を描画しない
  const display = composeDisplay(board, over ? null : piece)
  const wrapClass = [
    'board-wrap',
    over ? 'over' : '',
    // touch-action 等の抑制はジェスチャを受ける場合だけ掛ける (通常はページスクロールを妨げない)
    gestures.active ? 'gesture-area' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={wrapClass} {...gestures.handlers}>
      <div className="board">
        {display.flatMap((row, y) =>
          row.map((cell, x) => <Cell key={`${y}-${x}`} color={cell.color} ghost={cell.ghost} />),
        )}
      </div>
      {/*
        消去演出は盤面グリッドと同じ行ピッチのオーバーレイで描く。
        key を消去ごとの id にすることで、連続した消去でもアニメーションが確実に
        再生され直す (クラスの付け外しでは再生されないため)
      */}
      {flash && !over && (
        <div className="clear-flash" key={`clear-${flash.id}`} aria-hidden="true">
          {flash.rows.map((row) => (
            <div className="clear-flash-row" key={row} style={{ gridRow: row + 1 }} />
          ))}
        </div>
      )}
      {impact > 0 && !over && <div className="drop-impact" key={`drop-${impact}`} aria-hidden="true" />}
      {paused && !over && <PauseOverlay />}
    </div>
  )
}

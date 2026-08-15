import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { COLS } from '../game/constants'

/**
 * 盤面上のポインタジェスチャ操作 (PRD #16 モバイル対応)。
 *
 * PRD の定義: 「左右スワイプ移動、タップ回転、下スワイプでドロップ」。
 * ここではその判定を **純粋な状態遷移関数** (beginGesture / moveGesture / endGesture) として
 * 切り出し、React 依存部分 (useBoardGestures) は薄いラッパにとどめている。
 * こうすると座標列 → 発火する操作列 の対応を DOM なしで検証できる。
 *
 * 判定ルール:
 * - 水平スワイプ … セル幅 1 個ぶん動くごとに 1 マス移動 (ドラッグ量に追従。戻せば戻る)
 * - 下スワイプ   … セル幅 1 個ぶん動くごとにソフトドロップ 1 回
 * - 素早い下フリック … 短時間で大きく下へ動いたらハードドロップ (以後そのジェスチャは終了)
 * - タップ       … ほとんど動かずに短時間で離したら回転
 *
 * 軸は最初のしきい値超えで固定する (斜めのブレで左右移動と落下が混ざらないようにする)。
 */

/** ジェスチャが発火する操作。呼び出し側のコールバック名と 1:1 で対応する */
export type GestureAction = 'moveLeft' | 'moveRight' | 'rotate' | 'softDrop' | 'hardDrop'

/** 判定に使うポインタの位置と時刻 */
export interface GesturePoint {
  x: number
  y: number
  /** ms。performance.now() / event.timeStamp のどちらでもよい (差分しか見ない) */
  time: number
}

export interface GestureConfig {
  /** セル 1 個の一辺 (px)。移動 1 マスぶんの距離になる */
  cellSize: number
  /** 軸を固定するまでの移動距離 (セル数) */
  axisLockCells: number
  /** タップとみなす最大移動距離 (px) */
  tapMaxDistance: number
  /** タップとみなす最大押下時間 (ms) */
  tapMaxDurationMs: number
  /** ハードドロップとみなす下方向の最小移動距離 (セル数) */
  hardDropMinCells: number
  /** ハードドロップとみなす最大所要時間 (ms)。これを超えたら「ゆっくり下スワイプ」扱い */
  hardDropMaxDurationMs: number
}

/** セル幅が測れないとき (レイアウト前 / テスト DOM) のフォールバック。board.css の既定値と揃える */
export const DEFAULT_CELL_SIZE = 24

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  cellSize: DEFAULT_CELL_SIZE,
  axisLockCells: 0.6,
  tapMaxDistance: 10,
  tapMaxDurationMs: 300,
  hardDropMinCells: 2.5,
  hardDropMaxDurationMs: 250,
}

export interface GestureState {
  start: GesturePoint
  /** 固定された軸。null はまだどちらにも倒れていない (= タップになりうる) 状態 */
  axis: 'x' | 'y' | null
  /** これまでに送った左右移動のセル数 (右が正)。ドラッグを戻すと減る */
  movedCells: number
  /** これまでに送ったソフトドロップのセル数 */
  droppedCells: number
  /** 開始点からの最大移動距離 (px)。タップ判定に使う */
  maxDistance: number
  /** ハードドロップ発火済み等で、このジェスチャがもう操作を出さない状態か */
  finished: boolean
}

/** 変換結果。state は次の状態、actions はこの入力で発火する操作の列 (順序どおり) */
export interface GestureResult {
  state: GestureState
  actions: GestureAction[]
}

/** 現在時刻 (ms)。event.timeStamp と違いテストで偽タイマーに載せられる */
const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()

export const beginGesture = (point: GesturePoint): GestureState => ({
  start: point,
  axis: null,
  movedCells: 0,
  droppedCells: 0,
  maxDistance: 0,
  finished: false,
})

/** 同じ操作を n 回並べた配列 (移動 3 マスぶん = moveRight x3 のように使う) */
const repeat = (action: GestureAction, count: number): GestureAction[] =>
  count <= 0 ? [] : new Array<GestureAction>(count).fill(action)

export const moveGesture = (
  state: GestureState,
  point: GesturePoint,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
): GestureResult => {
  if (state.finished) return { state, actions: [] }

  const cell = config.cellSize > 0 ? config.cellSize : DEFAULT_CELL_SIZE
  const dx = point.x - state.start.x
  const dy = point.y - state.start.y
  const distance = Math.hypot(dx, dy)
  const maxDistance = Math.max(state.maxDistance, distance)

  // 軸の固定。しきい値を超えた瞬間の大きいほうの成分で決める
  let axis = state.axis
  if (axis === null && Math.max(Math.abs(dx), Math.abs(dy)) >= cell * config.axisLockCells) {
    axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
  }

  if (axis === null) {
    return { state: { ...state, maxDistance }, actions: [] }
  }

  if (axis === 'x') {
    // trunc なので「0.9 セルぶんのブレ」では動かず、1 セル超えて初めて 1 マス動く
    const target = Math.trunc(dx / cell)
    const delta = target - state.movedCells
    const actions = delta >= 0 ? repeat('moveRight', delta) : repeat('moveLeft', -delta)
    return {
      state: { ...state, axis, maxDistance, movedCells: target },
      actions,
    }
  }

  // 下方向のみ扱う (上スワイプに操作は割り当てない)
  const elapsed = point.time - state.start.time
  if (dy >= cell * config.hardDropMinCells && elapsed <= config.hardDropMaxDurationMs) {
    return {
      state: { ...state, axis, maxDistance, finished: true },
      actions: ['hardDrop'],
    }
  }

  const target = Math.max(0, Math.trunc(dy / cell))
  const delta = target - state.droppedCells
  return {
    state: { ...state, axis, maxDistance, droppedCells: Math.max(target, state.droppedCells) },
    actions: repeat('softDrop', delta),
  }
}

export const endGesture = (
  state: GestureState,
  point: GesturePoint,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
): GestureResult => {
  if (state.finished) return { state: { ...state, finished: true }, actions: [] }

  const dx = point.x - state.start.x
  const dy = point.y - state.start.y
  const maxDistance = Math.max(state.maxDistance, Math.hypot(dx, dy))
  const elapsed = point.time - state.start.time
  const isTap =
    state.axis === null && maxDistance <= config.tapMaxDistance && elapsed <= config.tapMaxDurationMs

  return {
    state: { ...state, maxDistance, finished: true },
    actions: isTap ? ['rotate'] : [],
  }
}

export interface BoardGestureHandlers {
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onRotate?: () => void
  onSoftDrop?: () => void
  onHardDrop?: () => void
}

/** ハンドラが 1 つでも渡されているか (未指定なら盤面ジェスチャは丸ごと無効) */
export const hasGestureHandlers = (handlers: BoardGestureHandlers): boolean =>
  Boolean(
    handlers.onMoveLeft ||
      handlers.onMoveRight ||
      handlers.onRotate ||
      handlers.onSoftDrop ||
      handlers.onHardDrop,
  )

/**
 * 盤面要素の実測からセル幅を求める。グリッドの gap / padding を無視した概算で十分
 * (1 マスぶんの移動量の基準にしか使わない)。測れない環境では既定値へフォールバック
 */
export const measureCellSize = (element: Element | null): number => {
  if (!element) return DEFAULT_CELL_SIZE
  const width = element.getBoundingClientRect().width
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_CELL_SIZE
  return width / COLS
}

/**
 * 盤面ジェスチャの React バインディング。
 * 返り値をそのまま盤面要素へ展開する (`<div {...gestures.handlers} />`)。
 * enabled が false、もしくはハンドラ未指定なら handlers は空になり、従来の挙動のまま。
 */
export function useBoardGestures(
  handlers: BoardGestureHandlers,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const stateRef = useRef<GestureState | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const configRef = useRef<GestureConfig>(DEFAULT_GESTURE_CONFIG)
  // 最新のコールバックを参照し続ける (ハンドラの再生成でジェスチャが切れないように)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const active = enabled && hasGestureHandlers(handlers)

  const dispatch = useCallback((actions: GestureAction[]) => {
    const current = handlersRef.current
    for (const action of actions) {
      if (action === 'moveLeft') current.onMoveLeft?.()
      else if (action === 'moveRight') current.onMoveRight?.()
      else if (action === 'rotate') current.onRotate?.()
      else if (action === 'softDrop') current.onSoftDrop?.()
      else if (action === 'hardDrop') current.onHardDrop?.()
    }
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // マウス (pointer: fine) では誤爆させない。キーボード操作と併用する PC 環境向け
      if (event.pointerType === 'mouse') return
      const element = event.currentTarget
      configRef.current = {
        ...DEFAULT_GESTURE_CONFIG,
        cellSize: measureCellSize(element.querySelector('.board') ?? element),
      }
      pointerIdRef.current = event.pointerId
      stateRef.current = beginGesture({ x: event.clientX, y: event.clientY, time: now() })
      if (typeof element.setPointerCapture === 'function') {
        try {
          element.setPointerCapture(event.pointerId)
        } catch {
          // 未対応環境ではキャプチャなしで続行する (盤面外へ出たら pointerleave で終了)
        }
      }
    },
    [],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const state = stateRef.current
      if (!state || pointerIdRef.current !== event.pointerId) return
      const result = moveGesture(
        state,
        { x: event.clientX, y: event.clientY, time: now() },
        configRef.current,
      )
      stateRef.current = result.state
      dispatch(result.actions)
    },
    [dispatch],
  )

  const finish = useCallback(
    (event: ReactPointerEvent<HTMLElement>, emit: boolean) => {
      const state = stateRef.current
      if (!state || pointerIdRef.current !== event.pointerId) return
      const result = endGesture(
        state,
        { x: event.clientX, y: event.clientY, time: now() },
        configRef.current,
      )
      stateRef.current = null
      pointerIdRef.current = null
      if (emit) dispatch(result.actions)
    },
    [dispatch],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finish(event, true),
    [finish],
  )
  // キャンセル / 盤面外へ抜けた場合はタップ (回転) を発火させずに終了する
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => finish(event, false),
    [finish],
  )

  return useMemo(
    () => ({
      active,
      handlers: active
        ? {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
            onPointerLeave: onPointerCancel,
          }
        : {},
    }),
    [active, onPointerDown, onPointerMove, onPointerUp, onPointerCancel],
  )
}

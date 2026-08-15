export type Cell = string | null
export type Board = Cell[][]
export type Shape = number[][]

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

/** SRS の回転状態 (0 = スポーン / 1 = 右回り 1 回 / 2 = 180° / 3 = 左回り 1 回) */
export type Rotation = 0 | 1 | 2 | 3

/** 回転方向。UI からは右回り (cw) が既定 */
export type RotationDir = 'cw' | 'ccw'

export interface Piece {
  /** ミノ種別。SRS のキックテーブル選択と T-スピン判定に必要 */
  type: TetrominoType
  shape: Shape
  color: string
  x: number
  y: number
  /** 現在の回転状態 */
  rotation: Rotation
}

/**
 * 直近のロックで発生したライン消去の情報 (PRD #7 の演出と #13 の加点表示用)。
 * 盤面自体は即時に更新されるため、これは「何が起きたか」を表示層へ伝えるだけの値
 */
export interface ClearInfo {
  /** 演出の再生キー。ロックごとに一意 (= そのロック後の pieceId) */
  id: number
  /** 消去された行番号 (消去前の盤面での index。上から順) */
  rows: number[]
  /** 消去ライン数 */
  cleared: number
  /** T-スピン (Mini を除く) と判定されたか */
  tspin: boolean
  /** この消去で加算されたスコア */
  points: number
}

export interface GameState {
  board: Board
  piece: Piece
  pieceId: number
  score: number
  /** 累計消去ライン数 */
  lines: number
  /** 現在のレベル (1 始まり。lines から導出される) */
  level: number
  over: boolean
  paused: boolean
  /** ネクスト表示用のキュー。常に QUEUE_SIZE (3) 個を保つ */
  queue: TetrominoType[]
  /** 現在の 7-bag の未配布ぶん */
  bag: TetrominoType[]
  /** このゲームを開始したときの乱数シード。リプレイ (#18) はこれで出現列を再現する */
  initialSeed: number
  /** 現在の乱数状態 (次に bag を作るときに使う) */
  seed: number
  /** ホールド枠のミノ種別 (PRD #6)。空なら null */
  hold: TetrominoType | null
  /** 現在のミノでホールドを使ったか。ロックのたびに false へ戻る */
  holdUsed: boolean
  /** 現在ミノが接地しているか (真下が衝突)。ロックディレイのタイマー起動条件 */
  grounded: boolean
  /** 接地中の移動・回転によるロックディレイ再始動の回数 (無限ロック回避) */
  lockResets: number
  /** これまでにミノが到達した最も低い y。ここを更新したときだけ lockResets を 0 に戻す */
  lockLowestY: number
  /** ロックディレイタイマーの再始動識別子。+1 されるたびにタイマーを張り直す */
  lockKey: number
  /** 直前に成立した操作が回転だったか (T-スピン判定の条件) */
  rotatedLast: boolean
  /** 直前の回転で成立したキックの index (0 = キックなし。-1 = 直前は回転でない) */
  lastKickIndex: number
  /** 直近のライン消去情報 (PRD #7 の演出用)。消去のないロックでは null */
  lastClear: ClearInfo | null
  /** ハードドロップの通し番号 (PRD #7 の着地演出のトリガ) */
  hardDropId: number
}

export type GameAction =
  | { type: 'tick' }
  | { type: 'move'; dx: -1 | 1 }
  | { type: 'rotate'; dir?: RotationDir }
  | { type: 'softDrop' }
  | { type: 'hardDrop'; pieceId: number }
  /** ロックディレイ満了。世代が一致し、かつ接地中のときだけ固定する */
  | { type: 'lock'; pieceId: number }
  | { type: 'hold' }
  | { type: 'togglePause' }
  /** seed を渡すと決定論的に開始する (省略時はランダム。リプレイ再生で使う) */
  | { type: 'restart'; seed?: number }

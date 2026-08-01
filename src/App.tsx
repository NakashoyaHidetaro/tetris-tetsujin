import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const COLS = 10
const ROWS = 20
const DROP_MS = 500

type Cell = string | null
type Board = Cell[][]
type Shape = number[][]

interface Piece {
  shape: Shape
  color: string
  x: number
  y: number
}

interface GameState {
  board: Board
  piece: Piece
  pieceId: number
  score: number
  over: boolean
}

const TETROMINOES: { shape: Shape; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: '#06b6d4' }, // I
  { shape: [[1, 1], [1, 1]], color: '#eab308' }, // O
  { shape: [[1, 1, 1], [0, 1, 0]], color: '#a855f7' }, // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' }, // L
]

const emptyBoard = (): Board =>
  Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null))

const randomPiece = (): Piece => {
  const { shape, color } = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)]
  return { shape, color, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

const collides = (board: Board, shape: Shape, x: number, y: number): boolean =>
  shape.some((row, dy) =>
    row.some((v, dx) => {
      if (!v) return false
      const px = x + dx
      const py = y + dy
      return px < 0 || px >= COLS || py >= ROWS || (py >= 0 && board[py][px] !== null)
    }),
  )

const rotateShape = (shape: Shape): Shape =>
  shape[0].map((_, i) => shape.map((row) => row[i]).reverse())

const newGame = (): GameState => ({
  board: emptyBoard(),
  piece: randomPiece(),
  pieceId: 0,
  score: 0,
  over: false,
})

const lockPiece = (state: GameState): GameState => {
  const board = state.board.map((row) => [...row])
  state.piece.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v && state.piece.y + dy >= 0) {
        board[state.piece.y + dy][state.piece.x + dx] = state.piece.color
      }
    }),
  )
  const remaining = board.filter((row) => row.some((cell) => cell === null))
  const cleared = ROWS - remaining.length
  while (remaining.length < ROWS) {
    remaining.unshift(Array<Cell>(COLS).fill(null))
  }
  const piece = randomPiece()
  return {
    board: remaining,
    piece,
    pieceId: state.pieceId + 1,
    score: state.score + cleared * 100 * cleared,
    over: collides(remaining, piece.shape, piece.x, piece.y),
  }
}

const step = (state: GameState): GameState => {
  if (state.over) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x, piece.y + 1)) {
    return lockPiece(state)
  }
  return { ...state, piece: { ...piece, y: piece.y + 1 } }
}

const move = (state: GameState, dx: number): GameState => {
  if (state.over) return state
  const { board, piece } = state
  if (collides(board, piece.shape, piece.x + dx, piece.y)) return state
  return { ...state, piece: { ...piece, x: piece.x + dx } }
}

const rotate = (state: GameState): GameState => {
  if (state.over) return state
  const { board, piece } = state
  const shape = rotateShape(piece.shape)
  if (collides(board, shape, piece.x, piece.y)) return state
  return { ...state, piece: { ...piece, shape } }
}

const hardDrop = (state: GameState): GameState => {
  if (state.over) return state
  let { y } = state.piece
  while (!collides(state.board, state.piece.shape, state.piece.x, y + 1)) {
    y++
  }
  return lockPiece({ ...state, piece: { ...state.piece, y } })
}

export default function App() {
  const [state, setState] = useState<GameState>(newGame)
  const stateRef = useRef(state)

  // useLayoutEffect で commit と同一タスク内に ref を同期する: paint 後に届く
  // keydown が常に最新の pieceId を見るため、描画済みの新ミノへの正当な
  // ハードドロップが世代不一致で無視される窓が生じない
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const timer = setInterval(() => setState(step), DROP_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // ハードドロップは不可逆のため、key repeat とロック境界をまたいだ入力が
      // 出現直後の次ミノへ誤適用されないよう pieceId 世代判定でガードする
      if (e.key === ' ') {
        // ゲームオーバー中は preventDefault せずボタンのネイティブ Space
        // activation (フォーカスした Restart の押下) に委ねる
        if (stateRef.current.over) return
        e.preventDefault()
        if (e.repeat) return
        const pieceId = stateRef.current.pieceId
        setState((s) => (s.pieceId === pieceId ? hardDrop(s) : s))
        return
      }
      const actions: Record<string, (s: GameState) => GameState> = {
        ArrowLeft: (s) => move(s, -1),
        ArrowRight: (s) => move(s, 1),
        ArrowDown: step,
        ArrowUp: rotate,
      }
      const action = actions[e.key]
      if (action) {
        e.preventDefault()
        setState(action)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const display = state.board.map((row) => [...row])
  state.piece.shape.forEach((row, dy) =>
    row.forEach((v, dx) => {
      const py = state.piece.y + dy
      const px = state.piece.x + dx
      if (v && py >= 0 && py < ROWS) display[py][px] = state.piece.color
    }),
  )

  return (
    <div className="game">
      <p className="score">Score: {state.score}</p>
      <div className="board">
        {display.flatMap((row, y) =>
          row.map((color, x) => (
            <div
              key={`${y}-${x}`}
              className="cell"
              style={color ? { background: color } : undefined}
            />
          )),
        )}
      </div>
      {state.over && (
        <div className="overlay">
          <p>Game Over</p>
          <button onClick={() => setState(newGame())}>Restart</button>
        </div>
      )}
      <p className="help">←→: 移動 / ↑: 回転 / ↓: 落下 / Space: 一気に落とす</p>
    </div>
  )
}

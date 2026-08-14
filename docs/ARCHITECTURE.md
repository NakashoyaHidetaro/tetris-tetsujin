# アーキテクチャ

このドキュメントは simple-tetris のファイル構成・責務分離・ゲームが動く仕組みをまとめたもの。機能の拡張計画は [PRD.md](./PRD.md) を参照。

## 技術スタック

- **React 19** + **react-dom**(ランタイム依存はこの 2 つのみ)
- **TypeScript**(`strict: true`、`noEmit: true` で型チェック専用)
- **Vite**(ビルド・開発サーバ)
- **Vitest**(ゲームロジック層のユニットテスト)
- 状態管理・アニメーション・Canvas 等の外部ライブラリは不使用

`npm run build` は `tsc --noEmit && vite build` であり、型エラーがあるとビルドが落ちる。CI(`.github/workflows/ci.yml`)は main への push と全 PR で build + test を実行する。

## 3 層構成

依存は上から下への一方向のみ。循環依存はない。

```
src/components/   表示専用コンポーネント + CSS
      ↑ props
src/hooks/        useTetris.ts — React 状態・タイマー・キーボード入力
      ↑ import
src/game/         React 非依存の純粋ロジック層(テストはここに集中)
```

- `src/game/` は React を一切 import しない純関数の集まり。ユニットテスト(`*.test.ts`)はこの層だけで完結する。
- React との接点は `hooks/useTetris.ts` に全集約されている。
- `App.tsx` が `useTetris()` を 1 回呼び、state を各コンポーネントに配る。プロップドリリングは 1 段のみ。

## ファイルの責務

### ロジック層 `src/game/`

| ファイル | 責務 |
|---|---|
| `types.ts` | 全型定義。`Cell = string \| null`、`Board = Cell[][]`、`Piece`、`GameState`、判別可能ユニオンの `GameAction` |
| `constants.ts` | `COLS = 10`、`ROWS = 20`、`DROP_MS = 500` の 3 定数のみ |
| `tetrominoes.ts` | 7 種ミノの形状(`number[][]`)と色のテーブル `TETROMINOES` |
| `piece.ts` | `randomPiece()`(ミノ生成)、`rotateShape()`(回転の純関数) |
| `board.ts` | `emptyBoard()`、`collides()`(衝突判定)、`composeDisplay()`(表示用合成) |
| `scoring.ts` | `scoreForClear`(1 行のみ) |
| `transitions.ts` | 状態遷移の本体: `newGame` / `lockPiece` / `step` / `move` / `rotate` / `hardDrop` |
| `reducer.ts` | `GameAction` を `transitions.ts` の関数に振り分けるだけの薄い層 |

依存グラフ: `constants` ← `piece` / `board` ← `transitions` ← `reducer`(`scoring` は独立)。

### React 層

| ファイル | 責務 |
|---|---|
| `hooks/useTetris.ts` | `useReducer` + `setInterval` + `keydown` リスナ。ゲームと React の接点すべて |
| `components/Board.tsx` | `composeDisplay()` の結果を 10×20 = 200 個の `<Cell>` として出力 |
| `components/Cell.tsx` | `memo` 化された 1 セル。色が変わらない限り再レンダリングされない |
| `components/ScorePanel.tsx` | スコア表示 |
| `components/HelpBar.tsx` | 操作説明 |
| `components/GameOverOverlay.tsx` | ゲームオーバー時のオーバーレイ + Restart ボタン |

## ゲームが動く仕組み

### ゲームループ

`requestAnimationFrame` ではなく `setInterval` によるティック方式。`useTetris.ts` がマウント時に 1 本だけタイマーを張り、`DROP_MS`(500ms)ごとに `tick` アクションを dispatch する。描画は React の再レンダリングに委ねる。落下速度は固定で、レベルによる加速は未実装(PRD で計画中)。

### 盤面のデータ表現

`Board = Cell[][]`(20 行 × 10 列、`board[y][x]` でアクセス)。`null` が空セル、CSS カラー文字列が固定済みブロック。

重要な設計判断: **確定盤面と落下中ミノを分離保持する**。`GameState.board` には固定済みブロックだけが入り、操作中のミノは `GameState.piece` として別管理。描画時に `composeDisplay()` が両者を合成した表示用ボードを作り、元の `board` は不変のまま。

### 回転・移動・衝突判定

- 回転は `rotateShape()` の「転置 + 各行反転」で時計回り 90°。壁キック(SRS)はなく、回転先が衝突するなら回転を拒否して同じ state を返す。
- 衝突判定は `collides()` の 1 箇所に集約。左壁・右壁・床・既存ブロックをチェックする。**上方向(`py < 0`)は意図的に衝突扱いしない**(盤面上部へのはみ出しを許容。`board.test.ts` で仕様として固定)。
- 移動・回転・ハードドロップはすべて「移動先で衝突判定 → しなければ確定」の try-then-commit 方式。
- ハードドロップは `while (!collides(..., y + 1)) y++` で床まで降ろして `lockPiece` を呼ぶ。
- ミノ生成は完全ランダム(7-bag ではないため同じミノが連続しうる)。

### ライン消去・スコア

`lockPiece()`(`transitions.ts`)が固定とライン消去を一手に担う:

1. `board` をコピーしてミノの色を焼き込む
2. `filter` で「空セルを 1 つでも含む行」だけを残す — これが消去処理
3. `unshift` で上から空行を補充して 20 行に戻す(重力落下も同時に表現)
4. 次のミノを生成し、スポーン位置で衝突するならゲームオーバー

スコアは `scoreForClear(n) = 100 × n²`(1 列 100 / 2 列 400 / 3 列 900 / 4 列 1600)。本家テトリスとは別の簡易式。

### 入力処理

`useTetris.ts` の単一 `keydown` リスナ(`window` に登録)。矢印キーはアクションテーブル(`ArrowLeft → move(-1)` など)でディスパッチし、`preventDefault()` でスクロールを抑止する。

**Space(ハードドロップ)だけ特別扱い**で、3 つの防御がある:

1. **`e.repeat` ガード** — キーリピートによる連続ハードドロップを防ぐ
2. **`pieceId` による世代ガード** — アクションに送信時点の `pieceId` を載せ、reducer 側で `state.pieceId === action.pieceId` のときだけ適用する。ロック境界をまたいで届いた入力が次のミノに誤適用されるのを防ぐ。`pieceId` は `lockPiece` のたびにインクリメントされる
3. **`useLayoutEffect` による ref 同期** — `stateRef` を commit と同一タスク内で同期し、描画済みの新ミノへの正当なドロップが世代不一致で無視される窓を消す

またゲームオーバー中は `preventDefault` せず、Restart ボタンにフォーカスがある状態での Space によるネイティブなボタン押下を殺さない。これらは `reducer.test.ts` に回帰テストがある。

### 描画

Canvas ではなく **DOM + CSS Grid**。`Board.tsx` が 200 個の `<Cell>` を並べ、`board.css` の `grid-template-columns: repeat(10, 24px)` で配置する。`Cell` は `memo` 化されており、毎ティック実際に色が変わる数セルだけが DOM 更新される。`key` は `` `${y}-${x}` `` で位置に紐付け。

### 状態管理

`useReducer` による単一ストア + イミュータブル更新。初期化は `useReducer(gameReducer, undefined, newGame)` の遅延初期化。

`GameState` は `board / piece / pieceId / score / over` の 5 フィールドのみ。ゲームオーバーは `over: boolean` フラグ 1 つで、`over` 中は各遷移関数が冒頭で**同一参照を早期リターン**するため React が再レンダリングをスキップする(この参照同一性自体が `toBe` でテストされている)。リスタートは `newGame()` で状態を丸ごと作り直す。

ポーズ機能は未実装(PRD で計画中)。

## テスト方針

テストは `src/game/` のロジック層に限定(`board` / `piece` / `reducer` / `transitions`)。フック・コンポーネントのテストはなく、`@testing-library/react` も未導入。ロジックが純関数に切り出されているため、主要な振る舞いはこの範囲で押さえられている。

代表的なテスト:

- 4 回回転すると元の形状に戻る(`piece.test.ts`)
- 盤面上部へのはみ出しは衝突にならない(`board.test.ts`)
- 古い `pieceId` を持つハードドロップは無視される(`reducer.test.ts`)
- ゲームオーバー中の操作は同一参照を返す(`reducer.test.ts`)

## 意図的な未実装(PRD 参照)

7-bag / 壁キック / レベル制・落下速度上昇 / ポーズ / ハイスコア保存 / ネクスト・ホールド・ゴースト表示 / 効果音。いずれも [PRD.md](./PRD.md) に拡張計画として記載されている。

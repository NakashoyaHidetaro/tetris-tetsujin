# simple-tetris

React + Vite + TypeScript で作ったシンプルなテトリス。

## 環境構築

### 必要なもの

- Node.js `^20.19.0 || >=22.12.0` (Vite 8 の要件)
- npm

### セットアップ

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

`http://localhost:5173/` が開発サーバーの URL。

### ビルド

```bash
npm run build
```

型チェック (`tsc --noEmit`) 後に `dist/` へ出力される。ビルド結果の確認は:

```bash
npm run preview
```

### テスト

```bash
npm test
```

vitest によるゲームロジック (`src/game/`) のユニットテスト。CI (GitHub Actions) でも build + test を実行する。

## ドキュメント

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — ファイル構成・責務分離・ゲームが動く仕組み
- [docs/PRD.md](./docs/PRD.md) — 機能の拡張計画

## 操作方法

| キー | 動作 |
|------|------|
| ← → | 移動 |
| ↑ | 回転 |
| ↓ | 落下 |
| Space | 一気に落とす |

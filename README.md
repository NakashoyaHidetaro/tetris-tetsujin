# simple-tetris

React + Vite + TypeScript で作ったシンプルなテトリス。

**公開 URL: https://nakashoyahidetaro.github.io/tetris-tetsujin/**

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

vitest によるユニットテスト。CI (GitHub Actions) でも build + test を実行する。

実行環境は 2 プロジェクトに分かれている (`vite.config.ts` の `test.projects`):

- `logic` — `src/game/**/*.test.ts` を **node** 環境で実行 (localStorage が無い環境の挙動を検証するテストを含むため)
- `ui` — `src/components/` `src/hooks/` などのテストを **jsdom** 環境で実行 (@testing-library/react + jest-dom)

## デプロイ

master への push で 2 系統のデプロイが並行して走る。

- `.github/workflows/deploy.yml` — AWS S3 (ルート配信、`base` は `/`)
- `.github/workflows/deploy-pages.yml` — GitHub Pages (サブパス配信、`GITHUB_PAGES=true` で `base` が `/tetris-tetsujin/` に切り替わる)

> **初回のみ手動設定が必要**: GitHub の **Settings → Pages → Build and deployment → Source** を
> **GitHub Actions** に変更しないと Pages のデプロイジョブが失敗する。

## PWA

Web App Manifest (`public/manifest.webmanifest`) + Service Worker でインストール・オフラインプレイに対応している。
Service Worker は `vite.config.ts` の自前 Vite プラグインがビルド時に `dist/sw.js` を生成する
(ランタイム依存を増やさないため外部プラグインは使っていない)。プリキャッシュ対象はビルド成果物から
自動で組み立てられ、`base` の違い (`/` と `/tetris-tetsujin/`) も自動で吸収される。

Service Worker は本番ビルドでのみ登録されるため、動作確認は `npm run build && npm run preview` で行う。

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
| P / Esc | ポーズ / 再開 |

ポーズ中も盤面は見えたままだが、盤面の上に `PAUSED` を表示し、ネクスト表示の中身は伏せられる。

## 画面

盤面の左に SCORE / BEST、右に NEXT (次に出てくる 3 手のミノ) を表示する。

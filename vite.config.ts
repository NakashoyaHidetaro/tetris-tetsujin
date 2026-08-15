/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages はプロジェクトサイトのためサブパス (`/tetris-tetsujin/`) 配信になる。
 * 一方 S3 配信 (既存の deploy.yml) はルート配信なので、Pages 向けビルドのときだけ
 * 環境変数 GITHUB_PAGES=true で base を切り替える。
 */
const base = process.env.GITHUB_PAGES === 'true' ? '/tetris-tetsujin/' : '/'

/**
 * PWA の Service Worker をビルド時に生成する自前プラグイン。
 * ランタイム依存を増やさない方針 (PRD Non-goals) のため vite-plugin-pwa 等は使わず、
 * バンドル結果のファイル名一覧からプリキャッシュ対象を組み立てて sw.js を emit する。
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'tetris-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        // sw.js 自身と source map はキャッシュ対象外
        .filter((name) => !name.endsWith('.map'))
        .map((name) => base + name)

      const precache = [
        base,
        ...assets,
        `${base}manifest.webmanifest`,
        `${base}icon-192.png`,
        `${base}icon-512.png`,
      ]
      // 重複除去 (base + 'index.html' と base が別エントリになるため)
      const urls = Array.from(new Set(precache))

      // ビルドごとに変わる名前にして、古いキャッシュを activate 時に破棄できるようにする
      const cacheName = `tetris-tetsujin-${Date.now().toString(36)}`

      const sw = `// このファイルはビルド時に自動生成される (vite.config.ts の serviceWorkerPlugin)
const CACHE = ${JSON.stringify(cacheName)}
const BASE = ${JSON.stringify(base)}
const PRECACHE = ${JSON.stringify(urls, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // ページ遷移はキャッシュした index.html を返す (オフライン起動)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .match(BASE, { ignoreSearch: true })
        .then((hit) => hit || caches.match(BASE + 'index.html', { ignoreSearch: true }))
        .then((hit) => hit || fetch(request)),
    )
    return
  }

  // アセットはハッシュ付きファイル名なので cache-first で問題ない
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw })
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), serviceWorkerPlugin()],
  test: {
    // src/game/ のロジックテストは「localStorage が無い環境」の検証を含むため node 環境のまま、
    // components / hooks のテストは DOM が要るため jsdom 環境、と実行環境を分ける
    projects: [
      {
        extends: true,
        test: {
          name: 'logic',
          environment: 'node',
          include: ['src/game/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: [
            'src/*.test.{ts,tsx}',
            'src/components/**/*.test.{ts,tsx}',
            'src/hooks/**/*.test.{ts,tsx}',
          ],
        },
      },
    ],
  },
})

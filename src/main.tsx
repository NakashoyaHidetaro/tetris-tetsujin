import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
// テーマ/パレット設定を描画前に <html> へ適用する (FOUC 回避のための副作用 import)
import './components/theme'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: Service Worker はビルド時にだけ生成されるので本番ビルドでのみ登録する。
// base は S3 配信 ('/') と GitHub Pages ('/tetris-tetsujin/') で変わるため BASE_URL から組み立てる
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // 登録に失敗してもゲーム自体は動くので握りつぶす
    })
  })
}

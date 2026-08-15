import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './menu-drawer.css'

/**
 * モバイル向けのスライドインメニュー (PRD #16 モバイル対応)。
 *
 * ☰ ボタンで右から開き、オーバーレイのタップ / Escape / 閉じるボタンで閉じる。
 * children をそのまま中に並べるだけの汎用コンポーネントで、ゲーム状態には触らない
 * (開いてもゲームは進行し続ける)。
 *
 * Escape はゲーム側 (useTetris) が window の bubble フェーズでポーズに使っているため、
 * ここではキャプチャフェーズで捕まえて stopPropagation し、
 * 「メニューを閉じるだけでポーズはしない」挙動にしている。
 */
export function MenuDrawer({
  children,
  label = 'メニュー',
}: {
  children: ReactNode
  /** ドロワーのアクセシブル名 (開閉ボタンのラベルにも使う) */
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    // 開閉ボタンにフォーカスを戻す (キーボード操作でも迷子にならないように)
    toggleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      toggleRef.current?.focus()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  // 開いたら閉じるボタンにフォーカスを移す
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        className="menu-drawer-toggle"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label={`${label}を開く`}
        title={label}
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* 背景オーバーレイ: タップで閉じる (装飾なので支援技術からは隠す) */}
          <div className="menu-drawer-overlay" onClick={close} aria-hidden="true" />
          <div className="menu-drawer-panel" role="dialog" aria-modal="true" aria-label={label}>
            <div className="menu-drawer-head">
              <span className="menu-drawer-title">{label}</span>
              <button
                type="button"
                ref={closeRef}
                className="menu-drawer-close"
                onClick={close}
                aria-label={`${label}を閉じる`}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <div className="menu-drawer-body">{children}</div>
          </div>
        </>
      )}
    </>
  )
}

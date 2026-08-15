import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MenuDrawer } from './MenuDrawer'

/**
 * モバイル向けメニュー (PRD #16) のテスト。
 * 状態は開閉フラグだけなので「開く / 閉じる経路 / children が出るか」を押さえる
 */

describe('MenuDrawer', () => {
  afterEach(cleanup)

  it('既定では閉じていて children は描かれない', () => {
    render(
      <MenuDrawer>
        <p>メニューの中身</p>
      </MenuDrawer>,
    )

    expect(screen.queryByText('メニューの中身')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'メニューを開く' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('☰ ボタンで開くと children が表示される', () => {
    render(
      <MenuDrawer>
        <p>メニューの中身</p>
      </MenuDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'メニューを開く' }))

    expect(screen.getByRole('dialog', { name: 'メニュー' })).toBeInTheDocument()
    expect(screen.getByText('メニューの中身')).toBeInTheDocument()
  })

  it('閉じるボタンで閉じる', () => {
    render(
      <MenuDrawer>
        <p>メニューの中身</p>
      </MenuDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'メニューを開く' }))
    fireEvent.click(screen.getByRole('button', { name: 'メニューを閉じる' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('メニューの中身')).not.toBeInTheDocument()
  })

  it('Escape で閉じ、ゲーム側 (window の bubble リスナ) には伝わらない', () => {
    const onWindowKeyDown = vi.fn()
    window.addEventListener('keydown', onWindowKeyDown)

    try {
      render(
        <MenuDrawer>
          <p>メニューの中身</p>
        </MenuDrawer>,
      )

      fireEvent.click(screen.getByRole('button', { name: 'メニューを開く' }))
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(onWindowKeyDown).not.toHaveBeenCalled()

      // 閉じた後は Escape を横取りしない (ポーズ操作に戻る)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onWindowKeyDown).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  })

  it('背景オーバーレイのタップで閉じる', () => {
    const { container } = render(
      <MenuDrawer>
        <p>メニューの中身</p>
      </MenuDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'メニューを開く' }))
    const overlay = container.querySelector('.menu-drawer-overlay')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay as Element)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('label を渡すとボタン・ダイアログのラベルに反映される', () => {
    render(
      <MenuDrawer label="設定">
        <p>中身</p>
      </MenuDrawer>,
    )

    fireEvent.click(screen.getByRole('button', { name: '設定を開く' }))
    expect(screen.getByRole('dialog', { name: '設定' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '設定を閉じる' })).toBeInTheDocument()
  })
})

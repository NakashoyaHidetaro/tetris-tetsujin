import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MuteToggle } from './MuteToggle'
import { isMuted, resetMutedForTest } from './settings'

const MUTED_KEY = 'tetris-tetsujin.muted'

describe('MuteToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    resetMutedForTest()
  })
  afterEach(cleanup)

  it('既定は音あり (ミュートされていない)', () => {
    render(<MuteToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('保存済みのミュート設定を復元する', () => {
    localStorage.setItem(MUTED_KEY, 'on')
    resetMutedForTest()
    render(<MuteToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('クリックで切り替わり localStorage に保存される', () => {
    render(<MuteToggle />)
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(isMuted()).toBe(true)
    expect(localStorage.getItem(MUTED_KEY)).toBe('on')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(isMuted()).toBe(false)
    expect(localStorage.getItem(MUTED_KEY)).toBe('off')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })
})

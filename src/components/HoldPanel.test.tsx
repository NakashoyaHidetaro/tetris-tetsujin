import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { HoldPanel } from './HoldPanel'

/**
 * ホールド表示 (PRD #6) の描き分け。
 * 「空 / 保持中 / 使用済み / ポーズ中」の 4 状態が崩れると、交換できるかどうかが
 * 画面から読み取れなくなるので、そこだけを押さえる
 */
describe('HoldPanel', () => {
  afterEach(cleanup)

  const slot = () => screen.getByLabelText('ホールド').querySelector('.hold-slot')!

  it('枠が空ならプレースホルダを出す', () => {
    render(<HoldPanel hold={null} used={false} paused={false} />)
    expect(slot()).toHaveTextContent('—')
  })

  it('保持中のミノをプレビューする', () => {
    const { container } = render(<HoldPanel hold="T" used={false} paused={false} />)
    // ミノ記号表示 (PRD #17) と同じ data-mino をセルに付ける
    expect(container.querySelectorAll('.next-cell.filled[data-mino="T"]')).toHaveLength(4)
  })

  it('使用済みの間は used クラスで薄く表示する', () => {
    render(<HoldPanel hold="T" used paused={false} />)
    expect(slot()).toHaveClass('used')
  })

  it('ポーズ中は中身を伏せる (NEXT と同じ扱い)', () => {
    const { container } = render(<HoldPanel hold="T" used={false} paused />)
    expect(container.querySelector('.next-cell.filled')).toBeNull()
    expect(slot()).toHaveTextContent('?')
  })
})

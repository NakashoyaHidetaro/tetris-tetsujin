import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Cell } from './Cell'

/**
 * component 層テストの足場が動いていることを確認するスモークテスト (#20 の基盤部分)。
 * Cell は「通常セルは background、ゴーストは borderColor に色を載せる」という
 * 描き分けが崩れると盤面表示が壊れるので、そこだけを浅く押さえる。
 */
describe('Cell', () => {
  afterEach(cleanup)

  it('色なしのセルは cell クラスだけを持つ', () => {
    const { container } = render(<Cell color={null} />)
    const el = container.firstElementChild!

    expect(el).toHaveClass('cell')
    expect(el).not.toHaveClass('ghost')
  })

  it('通常セルは背景色として色を塗る', () => {
    const { container } = render(<Cell color="#22d3ee" />)

    expect(container.firstElementChild).toHaveStyle({ background: '#22d3ee' })
  })

  it('ゴーストセルは枠線色として色を塗る', () => {
    const { container } = render(<Cell color="#22d3ee" ghost />)
    const el = container.firstElementChild!

    expect(el).toHaveClass('ghost')
    expect(el).toHaveStyle({ borderColor: '#22d3ee' })
  })
})

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { NextPanel, NextPreview } from './NextPanel'

/**
 * ネクスト表示 (PRD #1) のテスト。
 *
 * ここが守るリグレッション:
 * - プレビューが SRS 用の余白 (3x3 / 4x4) をそのまま描いてしまい形が読めなくなる
 * - キューの順序が入れ替わる / 件数が合わない
 * - ポーズ中 (PRD #4) にネクストが見えてしまう (「見て考える時間」になる)
 */
describe('NextPreview', () => {
  afterEach(cleanup)

  it('I ミノは余白を詰めて 4x1 で描く', () => {
    const { container } = render(<NextPreview type="I" />)

    expect(container.querySelectorAll('.next-cell')).toHaveLength(4)
    expect(container.querySelectorAll('.next-cell.filled')).toHaveLength(4)
  })

  it('T ミノは 3x2 の枠に 4 セルぶんだけ色を置く', () => {
    const { container } = render(<NextPreview type="T" />)

    expect(container.querySelectorAll('.next-cell')).toHaveLength(6)
    expect(container.querySelectorAll('.next-cell.filled')).toHaveLength(4)
  })

  it('色の付いたセルにはミノ種別が data-mino として載る (記号表示 PRD #17 の入口)', () => {
    const { container } = render(<NextPreview type="S" />)

    expect(container.querySelectorAll('[data-mino="S"]')).toHaveLength(4)
  })
})

describe('NextPanel', () => {
  afterEach(cleanup)

  it('キューの数だけスロットを並べる', () => {
    const { container } = render(<NextPanel queue={['I', 'O', 'T']} paused={false} />)

    expect(container.querySelectorAll('.next-slot')).toHaveLength(3)
    // 先頭 I (4 セル) + O (4 セル) + T (6 セル)
    expect(container.querySelectorAll('.next-cell')).toHaveLength(14)
  })

  it('ポーズ中は中身を伏せ、枠と NEXT 見出しは残す', () => {
    const { container } = render(<NextPanel queue={['I', 'O', 'T']} paused />)

    expect(screen.getByText('NEXT')).toBeInTheDocument()
    expect(container.querySelectorAll('.next-slot')).toHaveLength(3)
    expect(container.querySelectorAll('.next-cell')).toHaveLength(0)
    expect(screen.getAllByText('?')).toHaveLength(3)
  })
})

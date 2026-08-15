import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ScorePanel } from './ScorePanel'

/**
 * スコアパネル (PRD #3 スタッツ / #5 ハイスコア) のテスト。
 *
 * ここが守るリグレッション: ラベルと値の対応が入れ替わる (SCORE の位置に BEST が出る等)。
 * 4 つの数値を並べるだけの構造なので、順序と対応が壊れても型では気づけない
 */
describe('ScorePanel', () => {
  afterEach(cleanup)

  const labelledValue = (label: string): string | null =>
    screen.getByText(label).parentElement?.querySelector('.stat-value')?.textContent ?? null

  it('SCORE / BEST / LEVEL / LINES をそれぞれのラベルの値として表示する', () => {
    render(<ScorePanel score={1200} best={9800} level={4} lines={37} />)

    expect(labelledValue('SCORE')).toBe('1200')
    expect(labelledValue('BEST')).toBe('9800')
    expect(labelledValue('LEVEL')).toBe('4')
    expect(labelledValue('LINES')).toBe('37')
  })

  it('0 の値も (空欄にせず) 表示する', () => {
    render(<ScorePanel score={0} best={0} level={1} lines={0} />)

    expect(labelledValue('SCORE')).toBe('0')
    expect(labelledValue('LINES')).toBe('0')
  })

  it('スコア領域としてラベル付けされている', () => {
    render(<ScorePanel score={10} best={20} level={1} lines={0} />)

    expect(screen.getByLabelText('スコア')).toBeInTheDocument()
  })
})

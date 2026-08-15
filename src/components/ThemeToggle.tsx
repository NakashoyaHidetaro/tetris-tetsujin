import { useCallback, useId, useState } from 'react'
import {
  PALETTES,
  THEMES,
  applyDisplay,
  loadDisplay,
  saveDisplay,
  type Display,
} from './theme'
import './theme-toggle.css'

/**
 * 表示設定 UI (PRD #9 テーマ切替 / #17 色覚多様性対応)。
 *
 * 状態はこのコンポーネント内で完結し、変更は <html> の data 属性と
 * localStorage にだけ書き出す。ゲーム状態 (useTetris) には一切触らない
 */
export function ThemeToggle() {
  const [display, setDisplay] = useState<Display>(loadDisplay)
  // PC 用の左パネルとモバイル用メニューの両方に描かれるので、id は重複しないよう生成する
  const themeId = useId()
  const paletteId = useId()

  const update = useCallback((patch: Partial<Display>) => {
    setDisplay((prev) => {
      const next = { ...prev, ...patch }
      applyDisplay(next)
      saveDisplay(next)
      return next
    })
  }, [])

  return (
    <section className="display-settings" aria-label="表示設定">
      <div className="display-row">
        <span className="display-label" id={themeId}>
          テーマ
        </span>
        <div className="display-choices" role="group" aria-labelledby={themeId}>
          {THEMES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={value === display.theme ? 'display-choice is-active' : 'display-choice'}
              aria-pressed={value === display.theme}
              onClick={() => update({ theme: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="display-row">
        <span className="display-label" id={paletteId}>
          ミノ配色
        </span>
        <div className="display-choices" role="group" aria-labelledby={paletteId}>
          {PALETTES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={value === display.palette ? 'display-choice is-active' : 'display-choice'}
              aria-pressed={value === display.palette}
              onClick={() => update({ palette: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="display-check">
        <input
          type="checkbox"
          checked={display.symbols}
          onChange={(e) => update({ symbols: e.target.checked })}
        />
        <span>ミノに記号を表示</span>
      </label>
    </section>
  )
}

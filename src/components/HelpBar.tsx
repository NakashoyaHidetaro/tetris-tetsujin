import './help-bar.css'

export function HelpBar() {
  return (
    <p className="help">
      ←→: 移動 / ↑・X: 右回転 / Z: 左回転 / ↓: 落下 / Space: 一気に落とす / C・Shift: ホールド /
      P・Esc: ポーズ
    </p>
  )
}

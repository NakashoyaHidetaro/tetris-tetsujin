import './auto-toggle.css'

/**
 * 自動プレイ (AI) のトグル。見た目は MuteToggle と揃える。
 *
 * 状態は持たず、表示と onChange の通知だけを担う。ON/OFF の実体は App が持ち、
 * 手動操作が入ったときは App 側から OFF に戻される
 */
export function AutoToggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      className={enabled ? 'auto-toggle is-active' : 'auto-toggle'}
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? '自動プレイをオフにする' : '自動プレイをオンにする'}
      title={enabled ? '自動: オン' : '自動: オフ'}
    >
      <i className="bi bi-robot" aria-hidden="true" />
      <span className="auto-toggle-label">{enabled ? '自動オン' : '自動オフ'}</span>
    </button>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { isMuted, setMuted, subscribeMuted } from './settings'
import { soundEngine } from './synth'
import './mute-toggle.css'

/**
 * 効果音のミュートトグル (PRD #8)。
 *
 * 状態はストア (settings.ts) に閉じており、localStorage
 * `tetris-tetsujin.muted` に永続化される。ゲーム状態には触らない。
 */
export function MuteToggle() {
  const [muted, setLocal] = useState<boolean>(isMuted)

  // 他所 (キーボードショートカット等) から変更されても表示を追従させる
  useEffect(() => subscribeMuted(setLocal), [])

  const toggle = useCallback(() => {
    const next = !isMuted()
    setMuted(next)
    // ボタン押下はユーザー操作なので、ここで AudioContext を解錠しておくと
    // 「ミュート解除した直後の最初の音」から確実に鳴る
    if (!next) soundEngine.unlock()
  }, [])

  return (
    <button
      type="button"
      className={muted ? 'mute-toggle is-muted' : 'mute-toggle'}
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? '効果音をオンにする' : '効果音をオフにする'}
      title={muted ? '効果音: オフ' : '効果音: オン'}
    >
      <i className={muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill'} aria-hidden="true" />
      <span className="mute-toggle-label">{muted ? '効果音オフ' : '効果音オン'}</span>
    </button>
  )
}

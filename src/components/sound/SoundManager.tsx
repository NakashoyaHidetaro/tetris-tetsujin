import { useEffect, useRef } from 'react'
import { detectSoundEvents, toSoundSnapshot, type SoundEvent, type SoundSnapshot } from './events'
import { soundEngine } from './synth'

/**
 * 効果音の発火役 (PRD #8)。
 *
 * GameState を props で受け取り、useEffect で「前回 state との差分」から
 * 発音イベントを検出して鳴らすだけのコンポーネント。描画は行わない (null)。
 * この設計により useTetris / reducer / 既存コンポーネントに一切触れずに済む。
 */
export interface SoundManagerProps {
  /** useTetris が返す state (必要なフィールドだけを構造的に要求する) */
  state: SoundSnapshot
  /** テスト用の差し替え。省略時は Web Audio シンセで鳴らす */
  play?: (event: SoundEvent) => void
}

export function SoundManager({ state, play }: SoundManagerProps) {
  const prevRef = useRef<SoundSnapshot | null>(null)
  // play を依存配列に入れずに最新を参照するための ref (インライン関数で再購読しない)
  const playRef = useRef(play)
  playRef.current = play

  // autoplay policy 対応: 最初のユーザー操作で AudioContext を作って resume する
  useEffect(() => {
    if (typeof window === 'undefined') return
    const detach = () => {
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
    const unlock = () => {
      soundEngine.unlock()
      detach()
    }
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('touchstart', unlock)
    return detach
  }, [])

  useEffect(() => {
    const next = toSoundSnapshot(state)
    const events = detectSoundEvents(prevRef.current, next)
    // 初回描画 (prev が null) では何も鳴らない。StrictMode の二重実行でも
    // 2 回目は prev === next 相当になるため重複発音しない
    prevRef.current = next
    const emit = playRef.current ?? ((event: SoundEvent) => soundEngine.play(event))
    // forEach の index/array を渡さないよう明示的に 1 引数で呼ぶ
    events.forEach((event) => emit(event))
  }, [state])

  return null
}

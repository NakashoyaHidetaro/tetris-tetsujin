import type { SoundEvent } from './events'
import { isMuted } from './settings'

/**
 * Web Audio API による効果音シンセ (PRD #8)。
 *
 * ライブラリ不可・ランタイム依存追加不可のため、音源ファイルを同梱せず
 * オシレーター + ノイズバッファの合成だけで全ての効果音を作る。
 *
 * autoplay policy 対策として AudioContext はユーザー操作 (最初のキー入力や
 * クリック) が来るまで作らない / 作っても resume() するまで鳴らない。
 */

type Osc = OscillatorType

interface ToneSpec {
  /** 開始周波数 (Hz) */
  freq: number
  /** 終了周波数。指定すると開始からグライドする */
  to?: number
  type?: Osc
  /** 発音開始のオフセット秒 (アルペジオ用) */
  delay?: number
  /** 長さ (秒) */
  duration: number
  /** ピーク音量 (0-1) */
  gain?: number
}

const MASTER_GAIN = 0.28

/** 上昇/下降アルペジオを ToneSpec 列に展開する */
const arpeggio = (
  freqs: number[],
  opts: { type?: Osc; step: number; duration: number; gain?: number; delay?: number },
): ToneSpec[] =>
  freqs.map((freq, i) => ({
    freq,
    type: opts.type,
    delay: (opts.delay ?? 0) + i * opts.step,
    duration: opts.duration,
    gain: opts.gain,
  }))

/** 効果音ごとの合成レシピ。tones = 楽音、noise = ノイズバースト (打撃音) */
const RECIPES: Record<SoundEvent, { tones: ToneSpec[]; noise?: { duration: number; gain: number; delay?: number } }> = {
  // 移動: ごく短いクリック。連打しても耳障りにならない音量に抑える
  move: { tones: [{ freq: 220, type: 'square', duration: 0.035, gain: 0.35 }] },
  // 回転: 少し上へ跳ねるスイープで移動と区別する
  rotate: { tones: [{ freq: 330, to: 460, type: 'triangle', duration: 0.06, gain: 0.4 }] },
  // 着地 (ロック): 低い「コトッ」。ノイズを重ねて打撃感を出す
  lock: {
    tones: [{ freq: 180, to: 90, type: 'triangle', duration: 0.1, gain: 0.5 }],
    noise: { duration: 0.05, gain: 0.12 },
  },
  // ハードドロップ: 急降下スイープ + 強めのノイズで叩きつけた感じにする
  hardDrop: {
    tones: [
      { freq: 520, to: 70, type: 'sawtooth', duration: 0.13, gain: 0.45 },
      { freq: 110, to: 60, type: 'sine', duration: 0.16, gain: 0.5 },
    ],
    noise: { duration: 0.09, gain: 0.2 },
  },
  // ライン消去: 消した本数が増えるほど音数が増え、上へ伸びる
  clearSingle: {
    tones: arpeggio([523.25, 659.25], { type: 'sine', step: 0.05, duration: 0.12, gain: 0.4 }),
  },
  clearDouble: {
    tones: arpeggio([523.25, 659.25, 783.99], {
      type: 'sine',
      step: 0.05,
      duration: 0.13,
      gain: 0.42,
    }),
  },
  clearTriple: {
    tones: arpeggio([523.25, 659.25, 783.99, 1046.5], {
      type: 'sine',
      step: 0.05,
      duration: 0.14,
      gain: 0.44,
    }),
  },
  // テトリス (4 ライン): 豪華版。三和音アルペジオ + 5 度上のハモリ + 低音の土台
  tetris: {
    tones: [
      ...arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], {
        type: 'triangle',
        step: 0.055,
        duration: 0.18,
        gain: 0.45,
      }),
      ...arpeggio([783.99, 987.77, 1174.7, 1567.98, 1975.5], {
        type: 'sine',
        step: 0.055,
        duration: 0.16,
        gain: 0.22,
      }),
      { freq: 130.81, to: 261.63, type: 'sawtooth', duration: 0.5, gain: 0.22 },
      { freq: 1046.5, type: 'sine', delay: 0.3, duration: 0.45, gain: 0.3 },
    ],
  },
  // レベルアップ: 明るい上昇ファンファーレ
  levelUp: {
    tones: [
      ...arpeggio([440, 554.37, 659.25, 880], {
        type: 'square',
        step: 0.07,
        duration: 0.14,
        gain: 0.3,
      }),
      { freq: 880, type: 'triangle', delay: 0.28, duration: 0.3, gain: 0.3 },
    ],
  },
  // ゲームオーバー: 半音ずつ落ちていく下降 + 最後に低音とノイズ
  gameOver: {
    tones: [
      ...arpeggio([440, 415.3, 392, 349.23, 293.66], {
        type: 'sawtooth',
        step: 0.13,
        duration: 0.16,
        gain: 0.3,
      }),
      { freq: 146.83, to: 73.42, type: 'triangle', delay: 0.65, duration: 0.7, gain: 0.4 },
    ],
    noise: { duration: 0.4, gain: 0.1, delay: 0.65 },
  },
  // ポーズ / 再開: 対になる 2 音 (下降 / 上昇)
  pause: {
    tones: arpeggio([660, 440], { type: 'square', step: 0.08, duration: 0.08, gain: 0.28 }),
  },
  resume: {
    tones: arpeggio([440, 660], { type: 'square', step: 0.08, duration: 0.08, gain: 0.28 }),
  },
  // リスタート: 短い起動音
  restart: {
    tones: arpeggio([392, 523.25, 659.25], {
      type: 'triangle',
      step: 0.06,
      duration: 0.1,
      gain: 0.3,
    }),
  },
}

type AudioContextCtor = new () => AudioContext

const getAudioContextCtor = (): AudioContextCtor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

/** Web Audio が使えるか (jsdom や古いブラウザでは false) */
export const isAudioSupported = (): boolean => getAudioContextCtor() !== null

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private unlocked = false

  /**
   * AudioContext を用意する。autoplay policy により、ユーザー操作前に作った
   * context は suspended のままなので unlock() が呼ばれるまで生成しない
   */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = getAudioContextCtor()
    if (!Ctor) return null
    try {
      const ctx = new Ctor()
      const master = ctx.createGain()
      master.gain.value = MASTER_GAIN
      master.connect(ctx.destination)
      this.ctx = ctx
      this.master = master
      return ctx
    } catch {
      return null
    }
  }

  /** 最初のユーザー操作で呼ぶ。context の生成と resume を行う */
  unlock(): void {
    const ctx = this.ensure()
    if (!ctx) return
    this.unlocked = true
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // resume に失敗しても以降の操作で再試行されるので握りつぶす
      })
    }
  }

  /** ノイズバースト用のホワイトノイズ (0.5 秒ぶんを使い回す) */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer | null {
    if (this.noiseBuffer) return this.noiseBuffer
    try {
      const length = Math.floor(ctx.sampleRate * 0.5)
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1
      }
      this.noiseBuffer = buffer
      return buffer
    } catch {
      return null
    }
  }

  private playTone(ctx: AudioContext, master: GainNode, spec: ToneSpec): void {
    const start = ctx.currentTime + (spec.delay ?? 0)
    const end = start + spec.duration
    const osc = ctx.createOscillator()
    osc.type = spec.type ?? 'square'
    osc.frequency.setValueAtTime(spec.freq, start)
    if (spec.to !== undefined) {
      // 0 に近い値は exponentialRamp が使えないので下限を切る
      osc.frequency.exponentialRampToValueAtTime(Math.max(spec.to, 1), end)
    }

    const gain = ctx.createGain()
    const peak = spec.gain ?? 0.4
    // クリックノイズを避けるため短いアタックと指数減衰を付ける
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.01, spec.duration / 2))
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    osc.connect(gain)
    gain.connect(master)
    osc.start(start)
    osc.stop(end + 0.02)
  }

  private playNoise(
    ctx: AudioContext,
    master: GainNode,
    spec: { duration: number; gain: number; delay?: number },
  ): void {
    const buffer = this.getNoiseBuffer(ctx)
    if (!buffer) return
    const start = ctx.currentTime + (spec.delay ?? 0)
    const end = start + spec.duration

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // 生のホワイトノイズは耳につくのでローパスで丸める
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800, start)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(spec.gain, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(start)
    source.stop(end + 0.02)
  }

  /** 効果音を 1 つ鳴らす。ミュート中・未 unlock・非対応環境では何もしない */
  play(event: SoundEvent): void {
    if (isMuted() || !this.unlocked) return
    const ctx = this.ensure()
    const master = this.master
    if (!ctx || !master) return
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {})
    }

    const recipe = RECIPES[event]
    if (!recipe) return
    try {
      recipe.tones.forEach((tone) => this.playTone(ctx, master, tone))
      if (recipe.noise) this.playNoise(ctx, master, recipe.noise)
    } catch {
      // 個々の再生失敗でゲームを止めない
    }
  }
}

/** アプリ全体で 1 つだけ使う共有エンジン */
export const soundEngine = new SoundEngine()

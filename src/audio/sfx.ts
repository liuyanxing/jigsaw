// 极简 WebAudio 音效(吸附 / 完成)。无需音频资源文件。Android 用 SoundPool。

let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  return ctx
}

function blip(freq: number, startOffset: number, dur: number, gainPeak: number): void {
  const a = ac()
  const t = a.currentTime + startOffset
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = 'triangle'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export function snapSound(): void {
  try {
    blip(660, 0, 0.16, 0.18)
  } catch {
    // ignore
  }
}

export function winSound(): void {
  try {
    ;[523, 659, 784, 1046].forEach((f, i) => blip(f, i * 0.12, 0.3, 0.22))
  } catch {
    // ignore
  }
}

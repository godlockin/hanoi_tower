// Web Audio API sound effects for Hanoi Tower

class AudioManager {
  private ctx: AudioContext | null = null
  private enabled = true
  private volume = 0.3

  constructor() {
    // Initialize on first user interaction (browser requirement)
    this.init = this.init.bind(this)
  }

  init(): void {
    if (this.ctx) return
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn('Web Audio API not supported')
      this.enabled = false
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  toggle(): boolean {
    this.enabled = !this.enabled
    return this.enabled
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.enabled || !this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.frequency.value = frequency
    osc.type = type

    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration)

    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  // Soft pop sound for lifting disk
  playLift(): void {
    if (!this.ctx) this.init()
    this.playTone(400, 0.15, 'sine')
  }

  // Deeper thud for placing disk
  playPlace(): void {
    if (!this.ctx) this.init()
    this.playTone(200, 0.1, 'triangle')
  }

  // Error buzz for invalid move
  playInvalid(): void {
    if (!this.ctx) this.init()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.frequency.value = 150
    osc.type = 'sawtooth'

    gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15)

    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + 0.15)
  }

  // Victory arpeggio
  playVictory(): void {
    if (!this.ctx) this.init()
    if (!this.ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine'), i * 100)
    })
  }

  // Undo sound
  playUndo(): void {
    if (!this.ctx) this.init()
    this.playTone(300, 0.1, 'sine')
  }
}

export const audio = new AudioManager()

/**
 * Iron Man & JARVIS holographic sound effect synthesizer using Web Audio API
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private isHumming = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Sci-Fi UI Click / Chirp
  playClick(enabled = true) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio playClick error:', e);
    }
  }

  // Reactor Activation / Charge Up Sound
  playReactorCharge(enabled = true) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.45);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(240, now);
      osc2.frequency.exponentialRampToValueAtTime(1360, now + 0.45);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn('Audio playReactorCharge error:', e);
    }
  }

  // Success / Command Completed Chime
  playSuccess(enabled = true) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Stark chime)
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const noteTime = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.1, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.3);
      });
    } catch (e) {
      console.warn('Audio playSuccess error:', e);
    }
  }

  // Processing Beep Sequence
  playProcessingPulse(enabled = true) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('Audio playProcessingPulse error:', e);
    }
  }

  // Error / Warning Alert
  playError(enabled = true) {
    if (!enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio playError error:', e);
    }
  }

  // Ambient Reactor Low-Frequency Plasma Hum
  setAmbientHum(active: boolean, volume = 0.05) {
    try {
      this.initContext();
      if (!this.ctx) return;

      if (active && !this.isHumming) {
        this.ambientOsc = this.ctx.createOscillator();
        this.ambientGain = this.ctx.createGain();

        this.ambientOsc.type = 'sine';
        this.ambientOsc.frequency.setValueAtTime(58, this.ctx.currentTime); // Low 58Hz power hum

        this.ambientGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 1.5);

        this.ambientOsc.connect(this.ambientGain);
        this.ambientGain.connect(this.ctx.destination);

        this.ambientOsc.start();
        this.isHumming = true;
      } else if (!active && this.isHumming && this.ambientGain && this.ambientOsc) {
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        setTimeout(() => {
          try {
            this.ambientOsc?.stop();
            this.ambientOsc?.disconnect();
            this.ambientGain?.disconnect();
          } catch (_) {}
          this.isHumming = false;
        }, 500);
      }
    } catch (e) {
      console.warn('Audio setAmbientHum error:', e);
    }
  }

  getAudioContext(): AudioContext | null {
    this.initContext();
    return this.ctx;
  }
}

export const soundFx = new AudioSynthesizer();

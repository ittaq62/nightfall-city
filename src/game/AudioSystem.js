// Lightweight sound engine using the Web Audio API.
// Everything is synthesized at runtime, so no external audio files are needed.
export default class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.5;
  }

  setVolume(v01) {
    this.volume = Math.max(0, Math.min(1, v01));
    if (this.master && this.enabled) this.master.gain.value = this.volume;
  }

  // Must be called from a user gesture (e.g. the start-overlay click).
  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Low, continuous night-city drone + faint hiss.
  startAmbient() {
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 55;
    const dGain = this.ctx.createGain();
    dGain.gain.value = 0.05;
    drone.connect(dGain).connect(this.master);
    drone.start();

    const fifth = this.ctx.createOscillator();
    fifth.type = 'sine';
    fifth.frequency.value = 82.4;
    const fGain = this.ctx.createGain();
    fGain.gain.value = 0.025;
    fifth.connect(fGain).connect(this.master);
    fifth.start();

    // Filtered noise = distant city hiss
    const noise = this.makeNoise(2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const nGain = this.ctx.createGain();
    nGain.gain.value = 0.02;
    noise.connect(filter).connect(nGain).connect(this.master);
    noise.loop = true;
    noise.start();
  }

  makeNoise(seconds) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  // Short tone helper
  blip(freq = 440, dur = 0.08, type = 'square', vol = 0.18) {
    if (!this.ctx || !this.enabled) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  click() { this.blip(620, 0.05, 'square', 0.12); }
  consume() { this.blip(330, 0.12, 'sine', 0.22); }

  buy() {
    this.blip(523, 0.08, 'square', 0.15);
    setTimeout(() => this.blip(784, 0.12, 'square', 0.15), 80);
  }

  success() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.2), i * 110)
    );
  }

  footstep() {
    if (!this.ctx || !this.enabled) return;
    const src = this.makeNoise(0.06);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.06);
  }

  // Continuous rain hiss, faded in/out
  setRain(on) {
    if (!this.ctx) return;
    if (on && !this.rainNode) {
      const noise = this.makeNoise(2);
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.07, this.ctx.currentTime + 1.5);
      noise.connect(filter).connect(g).connect(this.master);
      noise.start();
      this.rainNode = { noise, gain: g };
    } else if (!on && this.rainNode) {
      const { noise, gain } = this.rainNode;
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
      setTimeout(() => { try { noise.stop(); } catch (e) {} }, 1200);
      this.rainNode = null;
    }
  }

  // Engine drone whose pitch follows the car speed
  startEngine() {
    if (!this.ctx || this.engineNode) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, this.ctx.currentTime + 0.3);
    osc.connect(filter).connect(g).connect(this.master);
    osc.start();
    this.engineNode = { osc, gain: g };
  }

  setEngineRpm(speed01) {
    if (!this.engineNode) return;
    this.engineNode.osc.frequency.value = 55 + speed01 * 130;
  }

  stopEngine() {
    if (!this.engineNode) return;
    const { osc, gain } = this.engineNode;
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    setTimeout(() => { try { osc.stop(); } catch (e) {} }, 400);
    this.engineNode = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    return this.enabled;
  }
}

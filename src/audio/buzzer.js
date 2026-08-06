/**
 * Classroom Noise Meter - Web Audio Synth Buzzer
 * Generates alarm alert tones using Web Audio API oscillators without external audio files.
 */

export class AudioBuzzer {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.intervalId = null;
    this.enabled = true;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  /**
   * Starts playing pulsing alert tone
   */
  startAlert() {
    if (!this.enabled || this.isPlaying) return;

    this.initContext();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isPlaying = true;
    this.pulseTone();
    this.intervalId = setInterval(() => this.pulseTone(), 400);
  }

  /**
   * Generates a single short beep tone pulse (880Hz square wave with smooth envelope)
   */
  pulseTone() {
    if (!this.audioCtx || !this.isPlaying || !this.enabled) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now); // A5 high alert tone

      // Envelope: fast attack, quick decay
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {
      // Ignore audio scheduling race conditions on teardown
    }
  }

  /**
   * Stops playing alert tone immediately
   */
  stopAlert() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setEnabled(enable) {
    this.enabled = enable;
    if (!enable) {
      this.stopAlert();
    }
  }

  /**
   * Plays a 1-second sample pulse sequence so teachers can test/demo the buzzer sound
   */
  playDemoTone() {
    this.initContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const playPulse = (offsetMs) => {
      setTimeout(() => {
        try {
          if (!this.audioCtx) return;
          const now = this.audioCtx.currentTime;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.26);
        } catch (e) {}
      }, offsetMs);
    };

    playPulse(0);
    playPulse(350);
    playPulse(700);
  }
}

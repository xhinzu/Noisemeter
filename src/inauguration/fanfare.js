/**
 * RISE 2026 Inauguration - Web Audio API Celebratory Fanfare Synthesizer
 */

export class FanfareAudio {
  constructor() {
    this.audioCtx = null;
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Play a celebratory rising fanfare arpeggio (C5 -> E5 -> G5 -> C6) culminating in a grand major chord
   */
  playCelebrationFanfare() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Arpeggio Notes (C5, E5, G5, C6) in Hz
      const arpeggioNotes = [
        { freq: 523.25, timeOffset: 0.00, duration: 0.18 }, // C5
        { freq: 659.25, timeOffset: 0.15, duration: 0.18 }, // E5
        { freq: 783.99, timeOffset: 0.30, duration: 0.18 }, // G5
        { freq: 1046.50, timeOffset: 0.45, duration: 0.80 }  // C6 (Triumphant lead)
      ];

      // Play rising arpeggio
      arpeggioNotes.forEach(note => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle'; // Warm brass/chime tone
        osc.frequency.setValueAtTime(note.freq, now + note.timeOffset);

        const startTime = now + note.timeOffset;
        const stopTime = startTime + note.duration;

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(stopTime);
      });

      // Play grand final C Major victory chord sustain starting at +0.45s
      const chordFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      const chordStart = now + 0.45;
      const chordDuration = 1.6;

      chordFreqs.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, chordStart);

        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.exponentialRampToValueAtTime(0.18, chordStart + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStart + chordDuration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(chordStart);
        osc.stop(chordStart + chordDuration);
      });

    } catch (err) {
      console.warn("Could not play fanfare audio:", err);
    }
  }
}

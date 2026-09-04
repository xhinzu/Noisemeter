/**
 * RISE 2026 Inauguration Manager - Cheer Energy Meter & Climax Trigger Controller
 */

export class InaugurationManager {
  constructor(confettiEngine, fanfareAudio) {
    this.confettiEngine = confettiEngine;
    this.fanfareAudio = fanfareAudio;

    this.isActiveMode = false;
    this.isRevealed = false;

    // Cheer accumulation state & configurable parameters
    this.cheerPowerPct = 0; // 0 to 100%
    this.targetDbThreshold = 75.0; // Minimum sound volume (dB) required to build cheer
    this.sustainedDurationSec = 3.5; // Required continuous shout duration (seconds)
    this.decayRate = 25.0; // Decay rate (% per sec) when quiet / below threshold

    this.lastFrameTime = performance.now();

    // Callbacks
    this.onCheerPowerUpdate = null;
    this.onInaugurationTriggered = null;
    this.onModeStateChange = null;
  }

  setSustainedDuration(sec) {
    this.sustainedDurationSec = Math.max(0.5, Math.min(15.0, parseFloat(sec)));
  }

  setTargetDbThreshold(db) {
    this.targetDbThreshold = parseFloat(db);
  }

  setDecayRate(ratePct) {
    this.decayRate = parseFloat(ratePct);
  }

  setMode(active) {
    this.isActiveMode = active;
    this.lastFrameTime = performance.now();
    if (!active) {
      this.resetCheer();
      if (this.confettiEngine) this.confettiEngine.stop();
    }
    if (this.onModeStateChange) {
      this.onModeStateChange(this.isActiveMode, this.isRevealed);
    }
  }

  toggleMode() {
    this.setMode(!this.isActiveMode);
  }

  /**
   * Process decibel input from audio frame using precise delta-time accumulation
   */
  processAudioFrame(db) {
    if (!this.isActiveMode || this.isRevealed) return;

    const now = performance.now();
    const dt = Math.min(0.1, (now - (this.lastFrameTime || now)) / 1000.0); // Delta time in seconds
    this.lastFrameTime = now;

    if (db >= this.targetDbThreshold) {
      // Accumulation rate (%/sec) = 100 / sustainedDurationSec
      const accumulateRate = 100.0 / Math.max(0.5, this.sustainedDurationSec);
      
      // Gentle boost scaling for intense shouting above threshold (up to 1.3x speed)
      const dbDelta = db - this.targetDbThreshold;
      const boost = Math.min(1.3, 1.0 + (dbDelta / 25.0));

      this.cheerPowerPct += accumulateRate * boost * dt;
    } else {
      // Rapid decay when crowd pauses or noise drops below threshold (prevents brief noises from building up)
      this.cheerPowerPct -= this.decayRate * dt;
    }

    this.cheerPowerPct = Math.max(0, Math.min(100, this.cheerPowerPct));

    if (this.onCheerPowerUpdate) {
      this.onCheerPowerUpdate(Math.round(this.cheerPowerPct));
    }

    // Trigger inauguration when cheer reaches 100%
    if (this.cheerPowerPct >= 100) {
      this.triggerInauguration();
    }
  }

  /**
   * Launch grand celebration (confetti, fanfare, reveal slide)
   */
  triggerInauguration() {
    if (this.isRevealed) return;
    this.isRevealed = true;
    this.cheerPowerPct = 100;

    if (this.onCheerPowerUpdate) {
      this.onCheerPowerUpdate(100);
    }

    // Play fanfare chime audio
    if (this.fanfareAudio) {
      this.fanfareAudio.playCelebrationFanfare();
    }

    // Fire party poppers and canvas confetti
    if (this.confettiEngine) {
      this.confettiEngine.launchCelebration();
    }

    if (this.onInaugurationTriggered) {
      this.onInaugurationTriggered();
    }
  }

  /**
   * Replay confetti + fanfare celebration without resetting mode
   */
  replayCelebration() {
    if (this.fanfareAudio) {
      this.fanfareAudio.playCelebrationFanfare();
    }
    if (this.confettiEngine) {
      this.confettiEngine.launchCelebration();
    }
  }

  /**
   * Reset cheer meter to 0% to allow another cheer buildup
   */
  resetCheer() {
    this.cheerPowerPct = 0;
    this.isRevealed = false;
    if (this.onCheerPowerUpdate) {
      this.onCheerPowerUpdate(0);
    }
  }
}

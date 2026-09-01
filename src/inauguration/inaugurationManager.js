/**
 * RISE 2026 Inauguration Manager - Cheer Energy Meter & Climax Trigger Controller
 */

export class InaugurationManager {
  constructor(confettiEngine, fanfareAudio) {
    this.confettiEngine = confettiEngine;
    this.fanfareAudio = fanfareAudio;

    this.isActiveMode = false;
    this.isRevealed = false;

    // Cheer accumulation state
    this.cheerPowerPct = 0; // 0 to 100%
    this.targetDbThreshold = 70.0; // Cheer threshold (dB)
    this.accumulateRate = 12.0;    // Pct added per frame when shouting
    this.decayRate = 3.5;          // Pct lost per frame when quiet

    // Callbacks
    this.onCheerPowerUpdate = null;
    this.onInaugurationTriggered = null;
    this.onModeStateChange = null;
  }

  setMode(active) {
    this.isActiveMode = active;
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
   * Process decibel input from audio frame
   */
  processAudioFrame(db) {
    if (!this.isActiveMode || this.isRevealed) return;

    if (db >= this.targetDbThreshold) {
      // Scale cheer build rate by how loud the sound is above threshold
      const dbDelta = db - this.targetDbThreshold;
      const boost = Math.min(2.5, 1.0 + (dbDelta / 15.0));
      this.cheerPowerPct += this.accumulateRate * boost * 0.1;
    } else {
      // Natural decay when crowd pauses
      this.cheerPowerPct -= this.decayRate * 0.1;
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

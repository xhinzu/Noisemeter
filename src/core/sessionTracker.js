/**
 * Classroom Noise Meter - Session Tracker & Analytics
 * Tracks class duration, quiet streaks, average noise level, and session metrics.
 */

export class SessionTracker {
  constructor() {
    this.startTime = Date.now();
    this.timerInterval = null;
    this.isSessionActive = false;

    this.currentQuietStreakSec = 0;
    this.longestQuietStreakSec = 0;

    this.totalAlerts = 0;
    this.dbSamples = [];

    // Callbacks
    this.onTick = null; // (elapsedSecFormatted, currentStreakFormatted) => void
  }

  start() {
    this.isSessionActive = true;
    this.startTime = Date.now();
    this.currentQuietStreakSec = 0;
    this.longestQuietStreakSec = 0;
    this.dbSamples = [];
    
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    this.isSessionActive = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  tick() {
    const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Every second, increment quiet streak if no active alert
    this.currentQuietStreakSec++;
    if (this.currentQuietStreakSec > this.longestQuietStreakSec) {
      this.longestQuietStreakSec = this.currentQuietStreakSec;
    }

    if (this.onTick) {
      this.onTick(
        this.formatTime(elapsedSec),
        this.formatTime(this.currentQuietStreakSec),
        this.formatTime(this.longestQuietStreakSec)
      );
    }
  }

  recordAudioFrame(db, isAlertActive) {
    if (db > 0) {
      this.dbSamples.push(db);
      if (this.dbSamples.length > 3600) { // Limit samples to 1 hour max
        this.dbSamples.shift();
      }
    }

    if (isAlertActive) {
      // Noise alert broke the quiet streak! Reset current streak.
      this.currentQuietStreakSec = 0;
    }
  }

  getSummary(totalAlertsCount) {
    const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
    let avgDb = 0;
    if (this.dbSamples.length > 0) {
      avgDb = Math.round(this.dbSamples.reduce((a, b) => a + b, 0) / this.dbSamples.length);
    }

    return {
      durationFormatted: this.formatTimeLong(elapsedSec),
      totalAlerts: totalAlertsCount,
      longestQuietStreakFormatted: this.formatTime(this.longestQuietStreakSec),
      avgDb: avgDb ? `${avgDb} dB` : '-- dB'
    };
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  formatTimeLong(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  reset() {
    this.start();
  }
}

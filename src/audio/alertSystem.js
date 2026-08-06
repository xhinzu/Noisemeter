/**
 * Classroom Noise Meter - Alert System & Debounce Controller
 * Handles threshold evaluation, sustained noise debouncing, teacher override checks, and alert triggers.
 */

export class AlertSystem {
  constructor(audioBuzzer) {
    this.buzzer = audioBuzzer;

    // Configurable parameters
    this.thresholdDb = 70.0;
    this.debounceSeconds = 2.5;
    this.isTeacherOverrideActive = false;

    // State tracking
    this.sustainedStartTime = null;
    this.isAlertActive = false;
    this.totalAlertCount = 0;

    // Callbacks
    this.onAlertStateChange = null; // (isActive, alertCount) => void
    this.onAlertTriggered = null;    // (alertCount) => void
  }

  /**
   * Processes incoming audio frame data
   */
  processFrame(frameData) {
    const { db, classification, crowdProbability } = frameData;
    const now = Date.now();

    // Condition for triggering an alert:
    // 1. Noise level meets or exceeds threshold dB
    // 2. Acoustic heuristic detects CROWD NOISE (crowd chatter spectral signature)
    // 3. Teacher Override is NOT active
    const isOverThreshold = db >= this.thresholdDb;
    const isCrowdNoise = classification === "CROWD NOISE" || crowdProbability >= 0.55;
    const shouldAlertCondition = isOverThreshold && isCrowdNoise && !this.isTeacherOverrideActive;

    if (shouldAlertCondition) {
      if (!this.sustainedStartTime) {
        this.sustainedStartTime = now;
      }

      const elapsedSeconds = (now - this.sustainedStartTime) / 1000;

      // Trigger alert if noise condition persists continuously for the debounce duration
      if (elapsedSeconds >= this.debounceSeconds && !this.isAlertActive) {
        this.isAlertActive = true;
        this.totalAlertCount++;

        // Start synth buzzer tone
        this.buzzer.startAlert();

        if (this.onAlertStateChange) {
          this.onAlertStateChange(true, this.totalAlertCount);
        }

        if (this.onAlertTriggered) {
          this.onAlertTriggered(this.totalAlertCount);
        }
      }
    } else {
      // Noise dropped or Teacher Override pressed -> reset debounce timer and deactivate alert
      this.sustainedStartTime = null;

      if (this.isAlertActive) {
        this.isAlertActive = false;
        this.buzzer.stopAlert();

        if (this.onAlertStateChange) {
          this.onAlertStateChange(false, this.totalAlertCount);
        }
      }
    }

    return {
      isAlertActive: this.isAlertActive,
      sustainedProgress: this.sustainedStartTime 
        ? Math.min(1.0, (now - this.sustainedStartTime) / (this.debounceSeconds * 1000))
        : 0
    };
  }

  setThreshold(db) {
    this.thresholdDb = db;
    // Save to localStorage
    try {
      localStorage.setItem('nm_threshold_db', db.toString());
    } catch(e) {}
  }

  setDebounce(sec) {
    this.debounceSeconds = sec;
    try {
      localStorage.setItem('nm_debounce_sec', sec.toString());
    } catch(e) {}
  }

  setTeacherOverride(active) {
    this.isTeacherOverrideActive = active;
    if (active && this.isAlertActive) {
      // Immediately silence active alerts when teacher turns on override
      this.isAlertActive = false;
      this.sustainedStartTime = null;
      this.buzzer.stopAlert();
      if (this.onAlertStateChange) {
        this.onAlertStateChange(false, this.totalAlertCount);
      }
    }
  }

  resetSession() {
    this.isAlertActive = false;
    this.sustainedStartTime = null;
    this.totalAlertCount = 0;
    this.buzzer.stopAlert();
    if (this.onAlertStateChange) {
      this.onAlertStateChange(false, 0);
    }
  }
}

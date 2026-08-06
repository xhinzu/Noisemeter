/**
 * Classroom Noise Meter - Teacher Override Manager
 * Manages "Teacher Speaking" override state and auto-reset countdown timers.
 */

export class TeacherOverride {
  constructor(alertSystem) {
    this.alertSystem = alertSystem;
    this.isActive = false;
    
    // Auto-reset timeout in seconds (0 = manual off only, default 45s)
    this.timeoutSeconds = 45;
    
    this.timerId = null;
    this.intervalId = null;
    this.remainingSeconds = 0;

    // Callbacks for UI updates
    this.onStateChange = null; // (isActive, remainingSec, totalSec) => void
  }

  toggle() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate() {
    this.isActive = true;
    this.alertSystem.setTeacherOverride(true);
    
    this.clearTimers();

    if (this.timeoutSeconds > 0) {
      this.remainingSeconds = this.timeoutSeconds;
      
      // Countdown interval for smooth UI ring/bar update
      this.intervalId = setInterval(() => {
        this.remainingSeconds--;
        if (this.remainingSeconds <= 0) {
          this.deactivate();
        } else {
          this.notifyState();
        }
      }, 1000);
    } else {
      this.remainingSeconds = 0;
    }

    this.notifyState();
  }

  deactivate() {
    this.isActive = false;
    this.alertSystem.setTeacherOverride(false);
    this.clearTimers();
    this.remainingSeconds = 0;
    this.notifyState();
  }

  clearTimers() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setTimeoutSeconds(sec) {
    this.timeoutSeconds = parseInt(sec, 10);
    try {
      localStorage.setItem('nm_override_timeout', this.timeoutSeconds.toString());
    } catch(e) {}
  }

  notifyState() {
    if (this.onStateChange) {
      this.onStateChange(this.isActive, this.remainingSeconds, this.timeoutSeconds);
    }
  }
}

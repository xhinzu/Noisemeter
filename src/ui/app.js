/**
 * Classroom Noise Meter - Application Main Controller & UI Renderer
 */

import { AudioEngine } from '../audio/engine.js';
import { AudioBuzzer } from '../audio/buzzer.js';
import { AlertSystem } from '../audio/alertSystem.js';
import { TeacherOverride } from '../core/teacherOverride.js';
import { SnapshotManager } from '../camera/snapshotManager.js';
import { SessionTracker } from '../core/sessionTracker.js';

import { ConfettiEngine } from '../inauguration/confetti.js';
import { FanfareAudio } from '../inauguration/fanfare.js';
import { InaugurationManager } from '../inauguration/inaugurationManager.js';
import { SpeechRecognitionManager } from '../audio/speechRecognition.js';
import { BloomInauguration } from '../bloom/bloomInauguration.js';

class ClassroomNoiseMeterApp {
  constructor() {
    // Core Modules
    this.audioEngine = new AudioEngine();
    this.buzzer = new AudioBuzzer();
    this.alertSystem = new AlertSystem(this.buzzer);
    this.teacherOverride = new TeacherOverride(this.alertSystem);
    this.sessionTracker = new SessionTracker();

    // Speech Recognition Live Subtitles (English & Malayalam)
    this.speechRecognition = new SpeechRecognitionManager();

    // RISE 2026 Inauguration Modules
    this.confettiCanvas = document.getElementById('confetti-canvas');
    this.confettiEngine = new ConfettiEngine(this.confettiCanvas);
    this.fanfareAudio = new FanfareAudio();
    this.inaugurationManager = new InaugurationManager(this.confettiEngine, this.fanfareAudio);

    // Bloom Interactive AR Flower Scattering Module
    this.bloomInauguration = new BloomInauguration();

    this.videoEl = document.getElementById('hidden-video');
    this.snapshotManager = new SnapshotManager(this.videoEl);

    // Gauge rendering state
    this.canvas = document.getElementById('gauge-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.currentGaugeDb = 35.0;

    // Local Storage Hydration
    this.loadSavedSettings();

    // DOM Elements
    this.initDOMElements();

    // Bind Handlers
    this.bindEvents();

    // Initialize Canvas & Check Camera Hardware
    this.renderGauge(35.0, this.alertSystem.thresholdDb);
    this.snapshotManager.checkCameraHardware();

    // Show Start Session modal on launch instead of auto-starting
    if (this.startSessionModal) {
      this.startSessionModal.classList.remove('hidden');
    }
  }

  loadSavedSettings() {
    try {
      const savedThreshold = localStorage.getItem('nm_threshold_db');
      if (savedThreshold) this.alertSystem.setThreshold(parseFloat(savedThreshold));

      const savedDebounce = localStorage.getItem('nm_debounce_sec');
      if (savedDebounce) this.alertSystem.setDebounce(parseFloat(savedDebounce));

      const savedTimeout = localStorage.getItem('nm_override_timeout');
      if (savedTimeout) this.teacherOverride.setTimeoutSeconds(parseInt(savedTimeout, 10));

      const savedRiseDuration = localStorage.getItem('nm_rise_duration');
      if (savedRiseDuration && this.inaugurationManager) this.inaugurationManager.setSustainedDuration(parseFloat(savedRiseDuration));

      const savedRiseThreshold = localStorage.getItem('nm_rise_threshold');
      if (savedRiseThreshold && this.inaugurationManager) this.inaugurationManager.setTargetDbThreshold(parseFloat(savedRiseThreshold));

      const savedRiseDecay = localStorage.getItem('nm_rise_decay');
      if (savedRiseDecay && this.inaugurationManager) this.inaugurationManager.setDecayRate(parseFloat(savedRiseDecay));
    } catch(e) {}
  }

  initDOMElements() {
    // Readouts & Badges
    this.dbValueEl = document.getElementById('db-value');
    this.acousticBadgeEl = document.getElementById('acoustic-classification');
    this.hSignalDescEl = document.getElementById('h-signal-desc');
    this.hProgressFillEl = document.getElementById('h-progress-fill');
    this.hConfidencePctEl = document.getElementById('h-confidence-pct');

    // Controls
    this.thresholdSlider = document.getElementById('threshold-slider');
    this.thresholdValDisplay = document.getElementById('threshold-val-display');
    this.debounceSlider = document.getElementById('debounce-slider');
    this.debounceValDisplay = document.getElementById('debounce-val-display');
    this.toggleBuzzer = document.getElementById('toggle-buzzer');

    // Stats Bar
    this.streakDisplay = document.getElementById('streak-display');
    this.alertCountDisplay = document.getElementById('alert-count-display');
    this.sessionTimerDisplay = document.getElementById('session-timer-display');

    // Zones
    this.zoneQuiet = document.getElementById('zone-quiet');
    this.zoneModerate = document.getElementById('zone-moderate');
    this.zoneLoud = document.getElementById('zone-loud');

    // Modals
    this.alertBanner = document.getElementById('alert-banner');
    this.startSessionModal = document.getElementById('start-session-modal');
    this.permissionModal = document.getElementById('permission-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.sessionModal = document.getElementById('session-modal');

    // Buttons
    this.btnStartClassSession = document.getElementById('btn-start-class-session');
    this.btnGrantMicModal = document.getElementById('btn-grant-mic-modal');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnEndSession = document.getElementById('btn-end-session');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.btnCloseSession = document.getElementById('btn-close-session');
    this.btnNewSession = document.getElementById('btn-new-session');
    this.btnTestBuzzer = document.getElementById('btn-test-buzzer');

    // Settings elements
    this.spectralSensitivitySlider = document.getElementById('spectral-sensitivity-slider');
    this.sensitivityValDisplay = document.getElementById('sensitivity-val-display');
    this.toggleWebcam = document.getElementById('toggle-webcam');
    this.webcamHardwareAlert = document.getElementById('webcam-hardware-alert');
    this.webcamOptionsPanel = document.getElementById('webcam-options-panel');
    this.webcamSelect = document.getElementById('webcam-select');
    this.photoCountBadge = document.getElementById('photo-count-badge');
    this.btnClearPhotosSettings = document.getElementById('btn-clear-photos-settings');

    // RISE Settings Controls
    this.riseDurationSlider = document.getElementById('rise-duration-slider');
    this.riseDurationValDisplay = document.getElementById('rise-duration-val-display');
    this.riseThresholdSlider = document.getElementById('rise-threshold-slider');
    this.riseThresholdValDisplay = document.getElementById('rise-threshold-val-display');
    this.riseDecaySlider = document.getElementById('rise-decay-slider');
    this.riseDecayValDisplay = document.getElementById('rise-decay-val-display');

    // Gallery
    this.galleryGrid = document.getElementById('gallery-grid');
    this.galleryCount = document.getElementById('gallery-count');
    this.btnDownloadAllPhotos = document.getElementById('btn-download-all-photos');
    this.btnClearGallery = document.getElementById('btn-clear-gallery');

    // RISE 2026 Inauguration DOM Elements
    this.btnInaugurationMode = document.getElementById('btn-inauguration-mode');
    this.inaugurationBannerCard = document.getElementById('inauguration-banner-card');
    this.cheerPowerVal = document.getElementById('cheer-power-val');
    this.cheerProgressFill = document.getElementById('cheer-progress-fill');
    this.btnManualInaugurate = document.getElementById('btn-manual-inaugurate');
    this.inaugurationRevealModal = document.getElementById('inauguration-reveal-modal');
    this.btnCloseRevealTop = document.getElementById('btn-close-reveal-top');

    // Bloom Mode DOM Elements
    this.toggleBloomMode = document.getElementById('toggle-bloom-mode');
    this.standardRevealBody = document.getElementById('standard-reveal-body');
    this.bloomRevealBody = document.getElementById('bloom-reveal-body');
    this.bloomRevealCanvas = document.getElementById('bloom-reveal-canvas');
    this.bloomWebcamVideo = document.getElementById('bloom-webcam-video');

    const isBloomEnabled = localStorage.getItem('bloomModeEnabled') === 'true';
    if (this.toggleBloomMode) this.toggleBloomMode.checked = isBloomEnabled;

    // Live Subtitles DOM Elements
    this.subtitlesBox = document.getElementById('subtitles-box');
    this.subtitlesText = document.getElementById('subtitles-text');
    this.speechStatusBadge = document.getElementById('speech-status-badge');
    this.btnLangEn = document.getElementById('btn-lang-en');
    this.btnLangMl = document.getElementById('btn-lang-ml');
    this.btnToggleSubtitles = document.getElementById('btn-toggle-subtitles');

    // Sync input values from state
    if (this.thresholdSlider) this.thresholdSlider.value = this.alertSystem.thresholdDb;
    if (this.thresholdValDisplay) this.thresholdValDisplay.textContent = `${this.alertSystem.thresholdDb} dB`;
    if (this.debounceSlider) this.debounceSlider.value = this.alertSystem.debounceSeconds;
    if (this.debounceValDisplay) this.debounceValDisplay.textContent = `${this.alertSystem.debounceSeconds} sec`;

    if (this.riseDurationSlider && this.inaugurationManager) {
      this.riseDurationSlider.value = this.inaugurationManager.sustainedDurationSec;
      if (this.riseDurationValDisplay) this.riseDurationValDisplay.textContent = `${this.inaugurationManager.sustainedDurationSec} sec`;
    }
    if (this.riseThresholdSlider && this.inaugurationManager) {
      this.riseThresholdSlider.value = this.inaugurationManager.targetDbThreshold;
      if (this.riseThresholdValDisplay) this.riseThresholdValDisplay.textContent = `${this.inaugurationManager.targetDbThreshold} dB`;
    }
    if (this.riseDecaySlider && this.inaugurationManager) {
      this.riseDecaySlider.value = this.inaugurationManager.decayRate;
      if (this.riseDecayValDisplay) this.riseDecayValDisplay.textContent = `${this.inaugurationManager.decayRate}%/sec`;
    }
  }

  bindEvents() {
    // 1. Audio Engine Callback
    this.audioEngine.onAudioFrame = (frameData) => {
      this.updateUIWithAudioFrame(frameData);
    };

    this.audioEngine.onError = (err) => {
      console.error("Audio Engine Error:", err);
      if (this.permissionModal) this.permissionModal.classList.remove('hidden');
    };

    // 2. Alert System Callbacks
    this.alertSystem.onAlertStateChange = (isActive, alertCount) => {
      this.alertCountDisplay.textContent = alertCount;
      if (isActive) {
        this.alertBanner.classList.remove('hidden');
        document.querySelector('.meter-card').classList.add('alert-active-card');
      } else {
        this.alertBanner.classList.add('hidden');
        document.querySelector('.meter-card').classList.remove('alert-active-card');
      }
    };

    this.alertSystem.onAlertTriggered = (alertCount) => {
      this.snapshotManager.onAlertTrigger(alertCount);
    };

    // 3. Session Tracker Callback
    this.sessionTracker.onTick = (elapsedStr, streakStr) => {
      this.sessionTimerDisplay.textContent = elapsedStr;
      this.streakDisplay.textContent = streakStr;
    };

    // 5. Snapshot Manager Callbacks
    this.snapshotManager.onHardwareDetected = (hasHardware, devices) => {
      if (!hasHardware) {
        this.webcamHardwareAlert.classList.remove('hidden');
        this.toggleWebcam.disabled = true;
      } else {
        this.webcamHardwareAlert.classList.add('hidden');
        this.toggleWebcam.disabled = false;
        
        // Populate camera select dropdown
        this.webcamSelect.innerHTML = devices.map((d, i) => 
          `<option value="${d.deviceId}">${d.label || `Camera ${i + 1}`}</option>`
        ).join('');
      }
    };

    this.snapshotManager.onSnapshotsUpdated = (list) => {
      this.photoCountBadge.textContent = list.length.toString();
      this.galleryCount.textContent = list.length.toString();
      this.renderGallery(list);
    };

    // 6. RISE 2026 Inauguration Callbacks & Controls
    this.inaugurationManager.onCheerPowerUpdate = (pct) => {
      if (this.cheerPowerVal) this.cheerPowerVal.textContent = `${pct}%`;
      if (this.cheerProgressFill) this.cheerProgressFill.style.width = `${pct}%`;
    };

    this.inaugurationManager.onInaugurationTriggered = () => {
      const isBloomEnabled = localStorage.getItem('bloomModeEnabled') === 'true';

      if (this.inaugurationRevealModal) {
        this.inaugurationRevealModal.classList.remove('hidden');
      }

      if (isBloomEnabled) {
        if (this.standardRevealBody) this.standardRevealBody.classList.add('hidden');
        if (this.bloomRevealBody) this.bloomRevealBody.classList.remove('hidden');

        // Stop background confetti engine so Bloom Mode runs at buttery-smooth 60fps
        if (this.confettiEngine) this.confettiEngine.stop();

        if (this.bloomRevealCanvas) {
          this.bloomInauguration.start(
            this.bloomRevealCanvas,
            this.bloomWebcamVideo || this.videoEl,
            () => {
              // Play fanfare audio when flowers scatter (no duplicate confetti pop)
              if (this.fanfareAudio) this.fanfareAudio.playCelebrationFanfare();
            }
          );
        }
      } else {
        if (this.bloomRevealBody) this.bloomRevealBody.classList.add('hidden');
        if (this.standardRevealBody) this.standardRevealBody.classList.remove('hidden');
      }
    };

    this.inaugurationManager.onModeStateChange = (active, revealed) => {
      if (active) {
        if (this.inaugurationBannerCard) this.inaugurationBannerCard.classList.remove('hidden');
        if (this.btnInaugurationMode) this.btnInaugurationMode.classList.add('active-mode');
      } else {
        if (this.inaugurationBannerCard) this.inaugurationBannerCard.classList.add('hidden');
        if (this.btnInaugurationMode) this.btnInaugurationMode.classList.remove('active-mode');
        if (this.inaugurationRevealModal) this.inaugurationRevealModal.classList.add('hidden');
        if (this.bloomInauguration) this.bloomInauguration.stop();
      }
    };

    if (this.btnInaugurationMode) {
      this.btnInaugurationMode.addEventListener('click', () => {
        this.inaugurationManager.toggleMode();
      });
    }

    if (this.btnManualInaugurate) {
      this.btnManualInaugurate.addEventListener('click', () => {
        this.inaugurationManager.triggerInauguration();
      });
    }

    const closeReveal = () => {
      if (this.inaugurationRevealModal) this.inaugurationRevealModal.classList.add('hidden');
      if (this.confettiEngine) this.confettiEngine.stop();
      if (this.bloomInauguration) this.bloomInauguration.stop();
      if (this.inaugurationManager) this.inaugurationManager.resetCheer();
    };

    if (this.btnCloseRevealTop) {
      this.btnCloseRevealTop.addEventListener('click', closeReveal);
    }

    if (this.inaugurationRevealModal) {
      this.inaugurationRevealModal.addEventListener('click', (e) => {
        if (e.target === this.inaugurationRevealModal) {
          closeReveal();
        }
      });
    }

    // 7. Live Subtitles Event Listeners & Callbacks (English & Malayalam)
    this.speechRecognition.onTranscriptUpdate = (text, lang) => {
      if (this.subtitlesText) {
        if (text.trim()) {
          this.subtitlesText.innerHTML = `<span class="transcript-live">${text}</span>`;
        } else {
          this.subtitlesText.innerHTML = `<span class="subtitles-placeholder">Speak into your microphone to view live subtitles in English or Malayalam...</span>`;
        }
      }
    };

    this.speechRecognition.onStatusChange = (isListening, lang, isSupported) => {
      if (this.speechStatusBadge) {
        if (!isSupported) {
          this.speechStatusBadge.textContent = "Speech Unsupported";
          this.speechStatusBadge.className = "badge badge-quiet";
        } else if (isListening) {
          this.speechStatusBadge.textContent = lang === 'ml-IN' ? "മലയാളം LIVE" : "ENGLISH LIVE";
          this.speechStatusBadge.className = "badge badge-crowd";
        } else {
          this.speechStatusBadge.textContent = "Subtitles Off";
          this.speechStatusBadge.className = "badge badge-quiet";
        }
      }
    };

    if (this.btnLangEn) {
      this.btnLangEn.addEventListener('click', () => {
        this.btnLangEn.classList.add('active-lang');
        if (this.btnLangMl) this.btnLangMl.classList.remove('active-lang');
        this.speechRecognition.setLanguage('en-IN');
      });
    }

    if (this.btnLangMl) {
      this.btnLangMl.addEventListener('click', () => {
        this.btnLangMl.classList.add('active-lang');
        if (this.btnLangEn) this.btnLangEn.classList.remove('active-lang');
        this.speechRecognition.setLanguage('ml-IN');
      });
    }

    if (this.btnToggleSubtitles) {
      this.btnToggleSubtitles.addEventListener('click', () => {
        const isEnabled = this.speechRecognition.toggle();
        this.btnToggleSubtitles.textContent = isEnabled ? "🎙️ ON" : "🔇 OFF";
      });
    }

    // --- UI Control Event Listeners ---

    // Start Session Button
    if (this.btnStartClassSession) {
      this.btnStartClassSession.addEventListener('click', () => {
        this.startSessionModal.classList.add('hidden');
        this.sessionTracker.start();
        this.startAudioStream();
      });
    }

    // Sliders
    if (this.thresholdSlider) {
      this.thresholdSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.thresholdValDisplay) this.thresholdValDisplay.textContent = `${val} dB`;
        this.alertSystem.setThreshold(val);
      });
    }

    if (this.debounceSlider) {
      this.debounceSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.debounceValDisplay) this.debounceValDisplay.textContent = `${val} sec`;
        this.alertSystem.setDebounce(val);
      });
    }

    if (this.riseDurationSlider) {
      this.riseDurationSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.riseDurationValDisplay) this.riseDurationValDisplay.textContent = `${val} sec`;
        if (this.inaugurationManager) this.inaugurationManager.setSustainedDuration(val);
      });
    }

    if (this.riseThresholdSlider) {
      this.riseThresholdSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.riseThresholdValDisplay) this.riseThresholdValDisplay.textContent = `${val} dB`;
        if (this.inaugurationManager) this.inaugurationManager.setTargetDbThreshold(val);
      });
    }

    if (this.riseDecaySlider) {
      this.riseDecaySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        let speedLabel = 'Medium';
        if (val <= 10) speedLabel = 'Slow';
        else if (val <= 25) speedLabel = 'Fast';
        else speedLabel = 'Instant';
        if (this.riseDecayValDisplay) this.riseDecayValDisplay.textContent = `${speedLabel} (${val}%/sec)`;
        if (this.inaugurationManager) this.inaugurationManager.setDecayRate(val);
      });
    }

    if (this.toggleBuzzer) {
      this.toggleBuzzer.addEventListener('change', (e) => {
        this.buzzer.setEnabled(e.target.checked);
      });
    }

    if (this.toggleBloomMode) {
      this.toggleBloomMode.addEventListener('change', (e) => {
        localStorage.setItem('bloomModeEnabled', e.target.checked ? 'true' : 'false');
      });
    }

    if (this.btnTestBuzzer) {
      this.btnTestBuzzer.addEventListener('click', () => {
        const originalText = this.btnTestBuzzer.innerHTML;
        this.btnTestBuzzer.innerHTML = '<span>🔊 Playing...</span>';
        this.buzzer.playDemoTone();
        setTimeout(() => {
          this.btnTestBuzzer.innerHTML = originalText;
        }, 1200);
      });
    }

    // Mic Access Modal Button
    if (this.btnGrantMicModal) {
      this.btnGrantMicModal.addEventListener('click', () => this.startAudioStream());
    }

    // Modals
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.remove('hidden');
      });
    }

    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => {
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }

    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => {
        try {
          if (this.thresholdSlider) localStorage.setItem('nm_threshold_db', this.thresholdSlider.value);
          if (this.debounceSlider) localStorage.setItem('nm_debounce_sec', this.debounceSlider.value);
          if (this.riseDurationSlider) localStorage.setItem('nm_rise_duration', this.riseDurationSlider.value);
          if (this.riseThresholdSlider) localStorage.setItem('nm_rise_threshold', this.riseThresholdSlider.value);
          if (this.riseDecaySlider) localStorage.setItem('nm_rise_decay', this.riseDecaySlider.value);
        } catch(e) {}
        if (this.settingsModal) this.settingsModal.classList.add('hidden');
      });
    }

    if (this.spectralSensitivitySlider) {
      this.spectralSensitivitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.sensitivityValDisplay) this.sensitivityValDisplay.textContent = `${val}%`;
        this.audioEngine.setSensitivity(val / 100);
      });
    }

    // Webcam Toggle
    if (this.toggleWebcam) {
      this.toggleWebcam.addEventListener('change', async (e) => {
        if (e.target.checked) {
          try {
            await this.snapshotManager.enableCamera(this.webcamSelect ? this.webcamSelect.value : null);
            if (this.webcamOptionsPanel) this.webcamOptionsPanel.classList.remove('hidden');
          } catch (err) {
            alert("Could not access webcam. Please check camera browser permissions.");
            e.target.checked = false;
          }
        } else {
          this.snapshotManager.stopCamera();
          if (this.webcamOptionsPanel) this.webcamOptionsPanel.classList.add('hidden');
        }
      });
    }

    if (this.webcamSelect) {
      this.webcamSelect.addEventListener('change', async (e) => {
        if (this.toggleWebcam && this.toggleWebcam.checked) {
          await this.snapshotManager.enableCamera(e.target.value);
        }
      });
    }

    if (this.btnClearPhotosSettings) {
      this.btnClearPhotosSettings.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all locally stored session snapshots?")) {
          this.snapshotManager.clearAllSnapshots();
        }
      });
    }

    // End Session Button
    if (this.btnEndSession) {
      this.btnEndSession.addEventListener('click', () => {
        this.showSessionSummary();
      });
    }

    if (this.btnCloseSession) {
      this.btnCloseSession.addEventListener('click', () => {
        if (this.sessionModal) this.sessionModal.classList.add('hidden');
      });
    }

    if (this.btnNewSession) {
      this.btnNewSession.addEventListener('click', () => {
        if (this.sessionModal) this.sessionModal.classList.add('hidden');
        this.alertSystem.resetSession();
        this.snapshotManager.clearAllSnapshots();
        this.sessionTracker.stop();
        if (this.alertCountDisplay) this.alertCountDisplay.textContent = "0";
        if (this.sessionTimerDisplay) this.sessionTimerDisplay.textContent = "00:00";
        if (this.streakDisplay) this.streakDisplay.textContent = "00:00";
        if (this.startSessionModal) {
          this.startSessionModal.classList.remove('hidden');
        }
      });
    }

    if (this.btnClearGallery) {
      this.btnClearGallery.addEventListener('click', () => {
        if (confirm("Clear all captured class photos?")) {
          this.snapshotManager.clearAllSnapshots();
        }
      });
    }

    if (this.btnDownloadAllPhotos) {
      this.btnDownloadAllPhotos.addEventListener('click', () => {
        this.downloadAllSnapshots();
      });
    }
  }

  async startAudioStream() {
    try {
      if (this.permissionModal) this.permissionModal.classList.add('hidden');
      await this.audioEngine.start();
      this.speechRecognition.start();
    } catch (err) {
      if (this.permissionModal) this.permissionModal.classList.remove('hidden');
    }
  }

  updateUIWithAudioFrame(frameData) {
    const { db, crowdProbability, classification } = frameData;

    // Smooth gauge DB needle
    this.currentGaugeDb = (this.currentGaugeDb * 0.75) + (db * 0.25);
    this.renderGauge(this.currentGaugeDb, this.alertSystem.thresholdDb);

    // Update Digital Readout
    this.dbValueEl.textContent = db.toFixed(1);

    // Update Acoustic Classification Badge
    this.acousticBadgeEl.textContent = classification;
    this.acousticBadgeEl.className = 'badge';
    if (classification === 'CROWD NOISE') {
      this.acousticBadgeEl.classList.add('badge-crowd');
      this.hSignalDescEl.textContent = 'Multi-Speaker Spectral Disorder Detected';
    } else if (classification === 'SINGLE VOICE') {
      this.acousticBadgeEl.classList.add('badge-single-voice');
      this.hSignalDescEl.textContent = 'Harmonic Voiced Formants (Single Voice)';
    } else {
      this.acousticBadgeEl.classList.add('badge-quiet');
      this.hSignalDescEl.textContent = 'Ambient Background Noise Floor';
    }

    // Heuristic Confidence Progress Bar
    const crowdPct = Math.round(crowdProbability * 100);
    this.hProgressFillEl.style.width = `${crowdPct}%`;
    this.hConfidencePctEl.textContent = `${crowdPct}%`;

    // Active Zone Highlighting
    this.zoneQuiet.classList.toggle('active-zone', db < 55);
    this.zoneModerate.classList.toggle('active-zone', db >= 55 && db <= 75);
    this.zoneLoud.classList.toggle('active-zone', db > 75);

    // Process Alert State Machine
    const alertResult = this.alertSystem.processFrame(frameData);

    // Feed real-time decibel frames to Inauguration Manager
    this.inaugurationManager.processAudioFrame(db);

    // Record sample to Session Tracker
    this.sessionTracker.recordAudioFrame(db, alertResult.isAlertActive);
  }

  /**
   * High performance Canvas Gauge renderer with strict B&W aesthetic and threshold marker
   */
  renderGauge(db, thresholdDb) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height - 25;
    const radius = 180;

    const startAngle = Math.PI * 0.85; // ~153 deg
    const endAngle = Math.PI * 2.15;   // ~387 deg
    const totalAngle = endAngle - startAngle;

    // Helper: Map dB (30 to 105) to arc angle
    const dbToAngle = (val) => {
      const pct = Math.max(0, Math.min(1, (val - 30) / (105 - 30)));
      return startAngle + (pct * totalAngle);
    };

    // 1. Draw Outer Track Arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Draw Filled Active Sound Level Arc
    const currentAngle = dbToAngle(db);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Draw Ticks & Labels (30, 50, 70, 90, 105 dB)
    const tickValues = [30, 45, 60, 75, 90, 105];
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    tickValues.forEach(tVal => {
      const angle = dbToAngle(tVal);
      const innerR = radius - 22;
      const outerR = radius - 10;
      const textR = radius - 38;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX + innerR * cos, centerY + innerR * sin);
      ctx.lineTo(centerX + outerR * cos, centerY + outerR * sin);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 2;
      ctx.stroke();

      const tx = centerX + textR * cos;
      const ty = centerY + textR * sin;
      ctx.fillText(`${tVal}`, tx, ty);
    });

    // 4. Draw Threshold Marker Line (Bold White Pin with Red accent point)
    const threshAngle = dbToAngle(thresholdDb);
    const thCos = Math.cos(threshAngle);
    const thSin = Math.sin(threshAngle);

    ctx.beginPath();
    ctx.moveTo(centerX + (radius - 28) * thCos, centerY + (radius - 28) * thSin);
    ctx.lineTo(centerX + (radius + 10) * thCos, centerY + (radius + 10) * thSin);
    ctx.strokeStyle = '#ff3333'; // Red threshold line
    ctx.lineWidth = 4;
    ctx.stroke();

    // 5. Draw Needle
    const nAngle = dbToAngle(db);
    const nCos = Math.cos(nAngle);
    const nSin = Math.sin(nAngle);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(centerX - 10 * nSin, centerY + 10 * nCos);
    ctx.lineTo(centerX + (radius - 40) * nCos, centerY + (radius - 40) * nSin);
    ctx.lineTo(centerX + 10 * nSin, centerY - 10 * nCos);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Needle Pivot Circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#18181c';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  renderGallery(snapshots) {
    if (snapshots.length === 0) {
      this.galleryGrid.innerHTML = `
        <div class="empty-gallery">
          <span class="empty-icon">📷</span>
          <p>No snapshots captured during this session.</p>
          <span class="empty-sub">Snapshots are logged every 5th noise alert when camera logging is enabled.</span>
        </div>
      `;
      this.btnDownloadAllPhotos.disabled = true;
      this.btnClearGallery.disabled = true;
      return;
    }

    this.btnDownloadAllPhotos.disabled = false;
    this.btnClearGallery.disabled = false;

    this.galleryGrid.innerHTML = snapshots.map(item => `
      <div class="gallery-item">
        <img src="${item.dataUrl}" alt="Class noise snapshot ${item.alertIndex}" />
        <div class="gallery-item-footer">
          <span>Alert #${item.alertIndex} &bull; ${item.timestamp}</span>
          <a href="${item.dataUrl}" download="noise_alert_${item.alertIndex}_${item.timestamp.replace(/:/g, '-')}.jpg" class="btn-link">Download</a>
        </div>
      </div>
    `).join('');
  }

  downloadAllSnapshots() {
    const snapshots = this.snapshotManager.getSnapshots();
    snapshots.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.dataUrl;
        link.download = `noise_alert_${item.alertIndex}_${item.timestamp.replace(/:/g, '-')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });
  }

  showSessionSummary() {
    const summary = this.sessionTracker.getSummary(this.alertSystem.totalAlertCount);

    document.getElementById('sum-duration').textContent = summary.durationFormatted;
    document.getElementById('sum-alerts').textContent = summary.totalAlerts;
    document.getElementById('sum-longest-streak').textContent = summary.longestQuietStreakFormatted;
    document.getElementById('sum-avg-db').textContent = summary.avgDb;

    this.renderGallery(this.snapshotManager.getSnapshots());
    this.sessionModal.classList.remove('hidden');
  }
}

// Instantiate application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ClassroomNoiseMeterApp();
});

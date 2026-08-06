/**
 * Classroom Noise Meter - Web Audio Signal Processing Engine
 * 
 * Technical Architecture & Acoustic Heuristic Explanation:
 * --------------------------------------------------------
 * A single omnidirectional microphone cannot physically determine the exact identity or count
 * of individual human speakers. However, it can analyze the physical acoustic characteristics 
 * of the sound wave.
 * 
 * 1. Single Voice Characteristics (e.g. Teacher speaking):
 *    - Produces continuous harmonic pitch peaks with distinct fundamental frequencies (F0) and formants.
 *    - Lower spectral flux variance between consecutive FFT frames.
 *    - Higher spectral peakedness (low spectral flatness) as energy concentrates in pitch harmonics.
 *    - Predictable Zero-Crossing Rate (ZCR) within speech voiced intervals.
 * 
 * 2. Crowd Noise Characteristics (Overlapping students chatting):
 *    - Multiple asynchronous speakers create dense, incoherent phase interference and broadband energy.
 *    - High spectral flux (rapid chaotic energy shifts across frequency bins).
 *    - Higher spectral flatness (broadband energy distributed across mid/high frequencies 500Hz - 4kHz).
 *    - High Zero-Crossing Rate variance due to irregular turbulent air and murmur overlay.
 * 
 * CRITICAL LIMITATION NOTE:
 * This algorithm is a best-effort signal processing heuristic. Acoustic reflections, background HVAC,
 * or loud individual speech can occasionally blur these metrics. Therefore, the application includes
 * a dedicated "Teacher Speaking" manual override button to give teachers absolute control when addressing the class.
 */

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.mediaStream = null;
    this.sourceNode = null;

    // Processing configuration
    this.fftSize = 2048;
    this.smoothingAlpha = 0.82; // Exponential smoothing factor for dB meter (0.0 = fast/jittery, 0.95 = damped)
    this.smoothedDb = 35.0; // Baseline starting value

    // Rolling window buffer for spectral heuristic analysis (~1 second window)
    this.windowFrames = 30; 
    this.spectralFluxHistory = [];
    this.zcrHistory = [];
    this.prevFrequencyData = null;

    // Heuristic sensitivity threshold (0.3 = sensitive, 0.7 = strict)
    this.crowdSensitivity = 0.65;

    // Callbacks
    this.onAudioFrame = null;
    this.onError = null;

    this.isProcessing = false;
    this.animationFrameId = null;
  }

  /**
   * Initializes the Web Audio API context and requests mic input stream
   */
  async start() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Request low-latency audio stream without aggressive noise suppression that distorts spectral flux
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.3; // Low native smoothing so we can analyze raw flux

      this.sourceNode.connect(this.analyser);

      this.isProcessing = true;
      this.prevFrequencyData = new Float32Array(this.analyser.frequencyBinCount);
      
      this.processLoop();
      return true;
    } catch (err) {
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  /**
   * Stops audio recording and releases media tracks
   */
  stop() {
    this.isProcessing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }

  /**
   * Main animation frame loop computing real-time sound features
   */
  processLoop = () => {
    if (!this.isProcessing || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const timeDomainData = new Float32Array(this.fftSize);
    const frequencyData = new Float32Array(bufferLength);

    this.analyser.getFloatTimeDomainData(timeDomainData);
    this.analyser.getFloatFrequencyData(frequencyData);

    // 1. Calculate RMS and Decibel Level
    let sumSquares = 0;
    let zeroCrossings = 0;
    let prevSample = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const sample = timeDomainData[i];
      sumSquares += sample * sample;

      if (i > 0 && ((sample >= 0 && prevSample < 0) || (sample < 0 && prevSample >= 0))) {
        zeroCrossings++;
      }
      prevSample = sample;
    }

    const rms = Math.sqrt(sumSquares / timeDomainData.length);
    // Convert RMS to decibel scale with calibrated SPL offset (~40dB room noise floor)
    const rawDb = 20 * Math.log10(Math.max(rms, 0.00001)) + 94; // 94 dB SPL ref offset
    const clampedRawDb = Math.max(30, Math.min(105, rawDb));

    // Exponential Moving Average Damping
    this.smoothedDb = (this.smoothedDb * this.smoothingAlpha) + (clampedRawDb * (1 - this.smoothingAlpha));

    // 2. Compute Spectral Flux (Sum of positive differences between magnitude spectrums)
    let flux = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < bufferLength; i++) {
      // Convert dBFS magnitude (-100 to 0) to linear magnitude (0 to 1)
      const currentMag = Math.pow(10, frequencyData[i] / 20);
      const prevMag = Math.pow(10, this.prevFrequencyData[i] / 20);
      
      const diff = currentMag - prevMag;
      if (diff > 0) flux += diff;
      totalMagnitude += currentMag;

      this.prevFrequencyData[i] = frequencyData[i];
    }

    // Normalize flux relative to total energy
    const normalizedFlux = totalMagnitude > 0.001 ? flux / totalMagnitude : 0;

    // 3. Compute Spectral Flatness (Ratio of Geometric Mean to Arithmetic Mean in speech range 300Hz-3400Hz)
    const sampleRate = this.audioCtx.sampleRate;
    const binHz = sampleRate / this.fftSize;
    const startBin = Math.floor(300 / binHz);
    const endBin = Math.min(bufferLength, Math.floor(3400 / binHz));
    
    let sumLog = 0;
    let sumLin = 0;
    let speechBinCount = 0;

    for (let i = startBin; i < endBin; i++) {
      const linMag = Math.pow(10, frequencyData[i] / 20) + 1e-8;
      sumLog += Math.log(linMag);
      sumLin += linMag;
      speechBinCount++;
    }

    const geometricMean = Math.exp(sumLog / speechBinCount);
    const arithmeticMean = sumLin / speechBinCount;
    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // 4. Update Rolling History Buffers
    const zcr = zeroCrossings / timeDomainData.length;
    this.spectralFluxHistory.push(normalizedFlux);
    this.zcrHistory.push(zcr);

    if (this.spectralFluxHistory.length > this.windowFrames) this.spectralFluxHistory.shift();
    if (this.zcrHistory.length > this.windowFrames) this.zcrHistory.shift();

    // 5. Calculate Variance across rolling window
    const fluxVariance = this.calculateVariance(this.spectralFluxHistory);
    const zcrVariance = this.calculateVariance(this.zcrHistory);

    // 6. Combine Features into Heuristic Classification
    // High spectral flux variance + moderate/high flatness = chaotic crowd chatter
    // Low flux variance + lower flatness (harmonic peaks) = single voice
    let crowdProbability = 0.0;

    if (this.smoothedDb > 45) { // Only evaluate voice character above quiet floor
      const fluxWeight = Math.min(1.0, fluxVariance * 25);
      const flatnessWeight = Math.min(1.0, spectralFlatness * 3.5);
      const zcrWeight = Math.min(1.0, zcrVariance * 40);

      crowdProbability = (fluxWeight * 0.45) + (flatnessWeight * 0.35) + (zcrWeight * 0.20);
      crowdProbability = Math.max(0.0, Math.min(1.0, crowdProbability));
    }

    let classification = "SILENT / QUIET";
    if (this.smoothedDb >= 48) {
      if (crowdProbability >= (1 - (this.crowdSensitivity * 0.5))) {
        classification = "CROWD NOISE";
      } else {
        classification = "SINGLE VOICE";
      }
    }

    // 7. Emit frame payload to UI subscriber
    if (this.onAudioFrame) {
      this.onAudioFrame({
        db: Math.round(this.smoothedDb * 10) / 10,
        rawDb: Math.round(clampedRawDb * 10) / 10,
        crowdProbability: Math.round(crowdProbability * 100) / 100,
        classification,
        fluxVariance,
        spectralFlatness,
        rms
      });
    }

    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };

  /**
   * Helper function calculating variance of an array of numbers
   */
  calculateVariance(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length;
  }

  /**
   * Setter to update crowd sensitivity threshold from UI settings
   */
  setSensitivity(val) {
    this.crowdSensitivity = Math.max(0.1, Math.min(1.0, val));
  }
}

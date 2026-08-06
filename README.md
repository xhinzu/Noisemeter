# Classroom Noise Meter

A responsive, client-side web application designed for smartboards, desktop PCs, and mobile browsers to monitor classroom sound levels in real time. The app distinguishes crowd chatter from a single voice using Web Audio API signal processing, alerts when noise exceeds a user-configured threshold, provides a manual teacher override, and offers optional local webcam snapshot logging.

---

## Key Features

- **Live Acoustic Metering (dB SPL)**: Smooth, damped analog gauge and digital readout showing real-time noise levels.
- **Crowd Noise vs. Single Voice Heuristic**: Analyzes audio spectral chaos to differentiate multi-speaker chatter from a single teacher voice.
- **Adjustable Alert Threshold**: Interactive slider (40 dB to 95 dB) with instant visual pin placement on the meter gauge.
- **Sustained Noise Debounce**: Configurable 1.0s to 5.0s window requiring continuous crowd noise before alerting (prevents false alarms from dropped objects or laughter).
- **Teacher Override System**: One-tap toggle button that immediately suppresses alerts while the teacher addresses the class, featuring a configurable auto-reset countdown timer.
- **Synthesized Audio Alert & Demo Button**: Web Audio API oscillator alarm tone with an on-screen demo button to test the audio output.
- **Optional Frequent-Talker Webcam Logging**: Feature-detected camera integration that logs a timestamped classroom snapshot on every 5th alert trigger.
- **Local Privacy Guarantee**: Webcam snapshots remain 100% strictly local to browser session memory/IndexedDB with no network transmission.
- **Class Session Analytics**: End-of-class report summarizing total class duration, total alert count, longest quiet streak record, average noise level, and downloadable photo gallery.
- **Monochrome Design Aesthetic**: High-contrast black-and-white dashboard optimized for smartboard legibility, reserving red strictly for the functional alert signal.

---

## Technical Architecture and Acoustic Heuristic

### Decibel Sound Level Calculation
Sound pressure level (dB SPL) is calculated by computing Root Mean Square (RMS) values from raw time-domain PCM buffers (`AnalyserNode.getFloatTimeDomainData`):

```
dB = 20 * log10(max(RMS, 0.00001)) + 94
```

To eliminate jittery needle movement, readings pass through exponential moving average damping:

```
smoothedDb = (smoothedDb * alpha) + (currentDb * (1 - alpha))
```

### Voice-Count Classification Heuristic
A single omnidirectional microphone cannot guarantee individual voice identification. However, it can analyze the physical acoustic structure of sound waves:

1. **Spectral Flux**: Measures frame-to-frame magnitude changes across FFT frequency bins. Overlapping asynchronous voices produce high, chaotic spectral flux.
2. **Spectral Flatness**: Measures energy distribution across the human vocal range (300Hz - 3400Hz). Single voices exhibit harmonic pitch peaks (lower flatness), whereas crowd chatter spreads energy broadly (higher flatness).
3. **Zero Crossing Rate (ZCR) Variance**: Measures signal sign-change rate stability over a rolling 1-second window.

These features yield a combined confidence score (`crowdProbability`). When sound exceeds the set threshold and exhibits crowd chatter spectral characteristics, the system classifies the audio as `CROWD NOISE`. Single loud voices are classified as `SINGLE VOICE` and do not trigger the alarm.

### Acoustic Limitation & Override Fallback
Because acoustic reflections, HVAC murmur, and room reverberation can influence signal heuristics, this system is a best-effort acoustic classifier. The **Teacher Override** toggle ("Teacher Speaking") is explicitly included as a physical fallback mechanism to guarantee zero false alerts while an instructor addresses the room.

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/xhinzu/Noisemeter.git
cd Noisemeter
npm install
```

### Running Development Server
Launch the Vite local development server:

```bash
npm run dev
```

Open `http://localhost:5173/` in your browser.

### Building for Production
Create an optimized production build:

```bash
npm run build
```

The output bundle will be generated in the `dist/` directory, ready to deploy as a static site.

---

## Browser & Hardware Requirements

- **Browser**: Works in any modern browser supporting Web Audio API (`AudioContext`, `AnalyserNode`) and WebRTC MediaDevices (`getUserMedia`).
- **Microphone**: Requires microphone access permissions.
- **Camera (Optional)**: Automatically detected via `navigator.mediaDevices.enumerateDevices()`. If no webcam hardware is present, the camera feature is gracefully hidden.

---

## Privacy Notice

All audio processing and camera snapshot storage occur entirely client-side inside device memory and IndexedDB. No audio streams, frequency data, or captured images are ever transmitted to any external server.

---

## License

ISC License.

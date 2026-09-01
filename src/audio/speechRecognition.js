/**
 * Classroom Noise Meter - Web Speech Recognition Subtitle Manager
 * Supports real-time streaming transcripts for English (en-IN/en-US) and Malayalam (ml-IN / മലയാളം)
 */

export class SpeechRecognitionManager {
  constructor() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognitionClass;
    this.recognition = SpeechRecognitionClass ? new SpeechRecognitionClass() : null;

    this.currentLanguage = 'en-IN'; // Default: English (India/Global)
    this.isEnabled = true;
    this.isListening = false;

    this.finalTranscript = '';
    this.interimTranscript = '';

    // Callbacks
    this.onTranscriptUpdate = null;
    this.onStatusChange = null;

    if (this.isSupported) {
      this.initRecognition();
    }
  }

  initRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.currentLanguage;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChange) {
        this.onStatusChange(true, this.currentLanguage, this.isSupported);
      }
    };

    this.recognition.onresult = (event) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += ' ' + transcriptChunk;
          // Keep last 150 characters to prevent scroll overflow
          if (this.finalTranscript.length > 250) {
            this.finalTranscript = this.finalTranscript.substring(this.finalTranscript.length - 200);
          }
        } else {
          interim += transcriptChunk;
        }
      }

      this.interimTranscript = interim;

      if (this.onTranscriptUpdate) {
        const fullText = (this.finalTranscript + ' ' + this.interimTranscript).trim();
        this.onTranscriptUpdate(fullText, this.currentLanguage);
      }
    };

    this.recognition.onerror = (event) => {
      // Ignore non-fatal 'no-speech' or 'aborted' errors
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn("Speech recognition notice:", event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStatusChange) {
        this.onStatusChange(false, this.currentLanguage, this.isSupported);
      }

      // Auto restart continuous listening if enabled
      if (this.isEnabled && this.isSupported) {
        try {
          this.recognition.start();
        } catch (e) {
          // Handled gracefully
        }
      }
    };
  }

  setLanguage(langCode) {
    if (this.currentLanguage === langCode) return;
    this.currentLanguage = langCode;

    const wasListening = this.isListening;
    if (this.isSupported && this.recognition) {
      if (this.isListening) {
        this.recognition.stop();
      }
      this.recognition.lang = this.currentLanguage;
      if (wasListening || this.isEnabled) {
        setTimeout(() => this.start(), 200);
      }
    }

    if (this.onStatusChange) {
      this.onStatusChange(this.isListening, this.currentLanguage, this.isSupported);
    }
  }

  start() {
    if (!this.isSupported || !this.recognition) return;
    this.isEnabled = true;
    if (!this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        // Recognition might already be running
      }
    }
  }

  stop() {
    this.isEnabled = false;
    if (this.isSupported && this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {}
    }
    this.isListening = false;
  }

  toggle() {
    if (this.isEnabled) {
      this.stop();
    } else {
      this.start();
    }
    return this.isEnabled;
  }

  clearTranscript() {
    this.finalTranscript = '';
    this.interimTranscript = '';
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate('', this.currentLanguage);
    }
  }
}

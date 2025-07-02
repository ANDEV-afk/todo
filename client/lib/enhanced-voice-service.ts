interface EnhancedVoiceOptions {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  noiseThreshold?: number;
}

export class EnhancedVoiceService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private options: EnhancedVoiceOptions = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseThreshold = 0.01;
  private confidenceThreshold = 0.7;

  constructor() {
    this.initializeRecognition();
    this.initializeAudioContext();
  }

  private initializeRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.setupRecognition();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("Audio context not available:", error);
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Enhanced configuration for better accuracy
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log("🎤 Voice recognition started");
      this.options.onStart?.();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 1;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      const transcript = finalTranscript || interimTranscript;
      const isFinal = finalTranscript.length > 0;

      // Apply noise filtering and confidence checking
      if (this.isValidTranscript(transcript, maxConfidence)) {
        this.options.onResult?.(transcript.trim(), isFinal, maxConfidence);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log("🎤 Voice recognition ended");
      this.options.onEnd?.();
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      let errorMessage = "Recognition error";

      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "Microphone not found. Please check your microphone.";
          break;
        case "not-allowed":
          errorMessage =
            "Microphone access denied. Please allow microphone access.";
          break;
        case "network":
          errorMessage =
            "Network error occurred. Please check your connection.";
          break;
        case "aborted":
          errorMessage = "Recognition aborted.";
          break;
        default:
          errorMessage = `Recognition error: ${event.error}`;
      }

      console.error("🎤 Voice recognition error:", errorMessage);
      this.options.onError?.(errorMessage);
    };
  }

  private isValidTranscript(transcript: string, confidence: number): boolean {
    if (!transcript || transcript.trim().length < 2) return false;

    // Check confidence threshold
    if (confidence > 0 && confidence < this.confidenceThreshold) return false;

    // Filter out noise words and gibberish
    const noisePatterns = [
      /^[uh|um|ah|er|hmm]+$/i,
      /^[a-z]$/i, // Single letters
      /^[\s\.,!?]+$/, // Just punctuation
    ];

    for (const pattern of noisePatterns) {
      if (pattern.test(transcript.trim())) return false;
    }

    return true;
  }

  public startListening(options: EnhancedVoiceOptions = {}) {
    if (!this.recognition) {
      options.onError?.("Speech recognition not supported");
      return false;
    }

    if (this.isListening) {
      this.stopListening();
      return false;
    }

    this.options = { ...options };
    this.noiseThreshold = options.noiseThreshold || 0.01;

    // Configure recognition based on options
    if (options.language) {
      this.recognition.lang = options.language;
    }

    if (options.continuous !== undefined) {
      this.recognition.continuous = options.continuous;
    }

    if (options.interimResults !== undefined) {
      this.recognition.interimResults = options.interimResults;
    }

    if (options.maxAlternatives !== undefined) {
      this.recognition.maxAlternatives = options.maxAlternatives;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error("Error starting recognition:", error);
      options.onError?.("Failed to start voice recognition");
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  public isSupported(): boolean {
    return !!(
      window.SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up noise detection
      if (this.audioContext && stream) {
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
      }

      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  }

  public getAudioLevel(): number {
    if (!this.analyser) return 0;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }

    return sum / bufferLength / 255;
  }

  public setConfidenceThreshold(threshold: number) {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  public setNoiseThreshold(threshold: number) {
    this.noiseThreshold = Math.max(0, Math.min(1, threshold));
  }
}

// Global enhanced voice service instance
export const enhancedVoiceService = new EnhancedVoiceService();

// Type declarations for TypeScript
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    AudioContext: new () => AudioContext;
    webkitAudioContext: new () => AudioContext;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

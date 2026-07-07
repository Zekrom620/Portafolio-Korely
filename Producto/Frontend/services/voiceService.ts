import { GoogleGenAI, Modality } from "@google/genai";

export class VoiceService {
  private recognition: any = null;
  private ai: GoogleGenAI | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordedBlobs: Blob[] = [];

  private currentTranscript = '';
  private interimTranscript = '';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  getCombinedAudioBlob(): Blob | null {
    if (this.recordedBlobs.length === 0) return null;
    const type = this.recordedBlobs[0].type;
    return new Blob(this.recordedBlobs, { type });
  }

  resetAudioChunks() {
    this.recordedBlobs = [];
    this.audioChunks = [];
    this.mediaRecorder = null;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (this.recognition && this.ai) return;

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';
    }

    // Initialize Gemini for TTS
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
  }

  async checkPermissions(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some(device => device.kind === 'audioinput');
      if (!hasMic) {
        console.error("No microphone devices found.");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error("Microphone permission error:", err);
      return false;
    }
  }

  async getMicrophones(): Promise<MediaDeviceInfo[]> {
    if (typeof window === 'undefined') return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (err) {
      console.error("Error listing devices:", err);
      return [];
    }
  }

  async startListening(
    onVolumeChange?: (volume: number) => void, 
    onTranscriptChange?: (transcript: string) => void,
    onError?: (error: string) => void,
    deviceId?: string
  ): Promise<void> {
    this.init();
    if (!this.recognition) {
      throw new Error("Speech recognition not supported");
    }

    this.currentTranscript = '';
    this.interimTranscript = '';
    
    try {
      // Set up real-time volume analysis
      const constraints = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.audioChunks = [];
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });
      } catch (e) {
        try {
          this.mediaRecorder = new MediaRecorder(this.stream);
        } catch (e2) {
          console.error("MediaRecorder not supported in this browser:", e2);
          this.mediaRecorder = null;
        }
      }

      if (this.mediaRecorder) {
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.start();
      }
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        if (onVolumeChange) onVolumeChange(Math.min(100, average * 2));
        if (this.stream) requestAnimationFrame(updateVolume);
      };
      updateVolume();

      this.recognition.onresult = (event: any) => {
        this.interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.currentTranscript += event.results[i][0].transcript + ' ';
          } else {
            this.interimTranscript += event.results[i][0].transcript;
          }
        }
        if (onTranscriptChange) {
          onTranscriptChange((this.currentTranscript + this.interimTranscript).trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error("Recognition error:", event.error);
        if (onError) {
          onError(event.error);
        }
      };

      this.recognition.start();
    } catch (err) {
      throw err;
    }
  }

  private cleanupAudio() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  stopListening(): string {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error(e);
      }
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        const chunks = this.audioChunks;
        const mime = this.mediaRecorder.mimeType;
        const recordedList = this.recordedBlobs;
        this.mediaRecorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: mime || 'audio/webm' });
          if (finalBlob.size > 0) {
            recordedList.push(finalBlob);
          }
        };
        this.mediaRecorder.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
    }

    const finalTranscript = (this.currentTranscript + this.interimTranscript).trim();
    this.cleanupAudio();
    return finalTranscript;
  }

  async speak(text: string): Promise<void> {
    this.init();
    if (!this.ai) {
      return this.browserSpeak(text);
    }
    try {
      // Use Gemini TTS for high quality
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say professionally and cordially: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioData = atob(base64Audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        
        return new Promise((resolve) => {
          source.onended = () => {
            resolve();
          };
          source.start();
        });
      } else {
        await this.browserSpeak(text);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      await this.browserSpeak(text);
    }
  }

  private browserSpeak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.onend = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}

export const voiceService = new VoiceService();

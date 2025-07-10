import { DeepNoteVoice, DeepNoteConfig, AudioVisualization, DeepNotePhase } from './types.js';

export class DeepNoteSynthesizer {
  private audioContext: AudioContext;
  private voices: DeepNoteVoice[] = [];
  private masterGain: GainNode;
  private config: DeepNoteConfig;
  private phase: DeepNotePhase = 'idle';
  private startTime: number = 0;
  private animationId: number | null = null;
  private onVisualizationUpdate?: (data: AudioVisualization) => void;

  // D major chord frequencies across 5 octaves
  private readonly targetFrequencies = [
    // D2, F#2, A2
    73.42, 92.50, 110.00,
    // D3, F#3, A3
    146.83, 185.00, 220.00,
    // D4, F#4, A4
    293.66, 369.99, 440.00,
    // D5, F#5, A5
    587.33, 739.99, 880.00,
    // D6, F#6, A6
    1174.66, 1479.98, 1760.00,
    // Additional voices for richness
    73.42, 92.50, 110.00, 146.83, 185.00, 220.00,
    293.66, 369.99, 440.00, 587.33, 739.99, 880.00,
    1174.66, 1479.98, 1760.00
  ];

  constructor(config: Partial<DeepNoteConfig> = {}) {
    this.config = {
      voiceCount: 30,
      minStartFreq: 200,
      maxStartFreq: 400,
      chaosDuration: 4, // 2 measures at 120 BPM
      convergeDuration: 3, // 1.5 measures at 120 BPM
      sampleRate: 44100,
      ...config
    };

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.1; // Start quiet
  }

  /**
   * Calculate equal loudness compensation gain based on ISO 226 40-phon curve
   * Reference: 1000Hz = 0dB compensation
   */
  private calculateCompensationGain(frequency: number): number {
    // Much simpler and more intuitive equal loudness compensation
    // Based on the general shape of equal loudness curves
    
    const f = Math.max(20, Math.min(20000, frequency));
    
    // Simple approximation: boost low frequencies more than high frequencies
    // Reference: 1000Hz = 1.0 (no compensation)
    let gain: number;
    
    if (f < 100) {
      // Very low frequencies need significant boost
      gain = 3.0;
    } else if (f < 200) {
      // Low frequencies need moderate boost
      gain = 2.0;
    } else if (f < 500) {
      // Lower mids need slight boost
      gain = 1.5;
    } else if (f < 2000) {
      // Mid frequencies are our reference
      gain = 1.0;
    } else if (f < 5000) {
      // Upper mids need slight boost
      gain = 1.2;
    } else {
      // High frequencies need moderate boost
      gain = 1.5;
    }
    
    return gain;
  }

  public setVisualizationCallback(callback: (data: AudioVisualization) => void): void {
    this.onVisualizationUpdate = callback;
  }

  public async start(): Promise<void> {
    if (this.phase !== 'idle') return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.initializeVoices();
    this.startTime = this.audioContext.currentTime;
    this.phase = 'chaos';
    
    this.scheduleAudioEvents();
    this.startVisualization();

    this.scheduleEnding();
  }

  private scheduleEnding() {
    // Schedule fade-out starting at 9 seconds, complete stop at 10 seconds
    setTimeout(() => {
      if (this.phase !== 'idle') {
        const currentTime = this.audioContext.currentTime;
        const fadeTime = 1.0; // 1 second fade
        
        // Exponential fade-out on master gain (sounds more natural)
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, currentTime + fadeTime);
        
        // Stop everything after fade completes
        setTimeout(() => {
          if (this.phase !== 'idle') {
            this.stop();
          }
        }, fadeTime * 1000);
      }
    }, 11000); // Start fade at 11 seconds
  }

  public stop(): void {
    this.phase = 'idle';
    this.voices.forEach(voice => {
      voice.oscillator.stop();
    });
    this.voices = [];
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private initializeVoices(): void {
    this.voices = [];
    
    for (let i = 0; i < this.config.voiceCount; i++) {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Random starting frequency
      const startFrequency = this.config.minStartFreq + 
        Math.random() * (this.config.maxStartFreq - this.config.minStartFreq);
      
      // Assign target frequency (cycle through the D major chord)
      const targetFrequency = this.targetFrequencies[i % this.targetFrequencies.length];
      
      // Calculate equal loudness compensation for the target frequency
      const compensationGain = this.calculateCompensationGain(targetFrequency);
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = startFrequency;
      
      gainNode.gain.value = 0;
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      this.voices.push({
        oscillator,
        gainNode,
        startFrequency,
        targetFrequency,
        currentFrequency: startFrequency,
        compensationGain
      });
      
      oscillator.start();
    }
  }

  private scheduleAudioEvents(): void {
    const currentTime = this.audioContext.currentTime;
    const chaosEndTime = currentTime + this.config.chaosDuration;
    const convergeEndTime = chaosEndTime + this.config.convergeDuration;
    const autoStopTime = currentTime + 10; // Auto-stop after 10 seconds
    
    // Fade in during chaos phase
    this.masterGain.gain.setValueAtTime(0.01, currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.3, currentTime + 1);
    
    // Individual voice gain envelopes with compensation
    this.voices.forEach((voice, index) => {
      // Stagger voice entrances slightly
      const entryDelay = Math.random() * 0.5;
      const baseGain = 0.1;
      const compensatedGain = baseGain * voice.compensationGain;
      
      voice.gainNode.gain.setValueAtTime(0, currentTime + entryDelay);
      voice.gainNode.gain.exponentialRampToValueAtTime(compensatedGain, currentTime + entryDelay + 0.5);
    });
    
    // Schedule frequency convergence
    this.scheduleFrequencyConvergence(chaosEndTime, convergeEndTime);
    
    // Final crescendo
    this.masterGain.gain.exponentialRampToValueAtTime(0.8, convergeEndTime);
    this.masterGain.gain.exponentialRampToValueAtTime(0.1, convergeEndTime + 2);
  }

  private scheduleFrequencyConvergence(startTime: number, endTime: number): void {
    const updateInterval = 0.01; // 10ms updates
    const totalUpdates = Math.floor((endTime - startTime) / updateInterval);
    
    for (let i = 0; i <= totalUpdates; i++) {
      const time = startTime + (i * updateInterval);
      const progress = i / totalUpdates;
      
      // Smooth convergence curve (ease-in-out)
      const easedProgress = 0.5 * (1 - Math.cos(Math.PI * progress));
      
      this.voices.forEach(voice => {
        const freqDiff = voice.targetFrequency - voice.startFrequency;
        const newFreq = voice.startFrequency + (freqDiff * easedProgress);
        voice.oscillator.frequency.setValueAtTime(newFreq, time);
      });
    }
  }

  private startVisualization(): void {
    const updateVisualization = () => {
      if (this.phase === 'idle') return;
      
      const currentTime = this.audioContext.currentTime;
      const elapsed = currentTime - this.startTime;
      
      // Update phase
      if (elapsed > this.config.chaosDuration + this.config.convergeDuration) {
        this.phase = 'sustain';
      } else if (elapsed > this.config.chaosDuration) {
        this.phase = 'converge';
      }
      
      // Calculate current frequencies for visualization
      const frequencies = this.voices.map(voice => {
        if (this.phase === 'chaos') {
          return voice.startFrequency;
        } else if (this.phase === 'converge') {
          const convergeProgress = (elapsed - this.config.chaosDuration) / this.config.convergeDuration;
          const easedProgress = 0.5 * (1 - Math.cos(Math.PI * convergeProgress));
          const freqDiff = voice.targetFrequency - voice.startFrequency;
          return voice.startFrequency + (freqDiff * easedProgress);
        } else {
          return voice.targetFrequency;
        }
      });
      
      // Generate amplitude data based on actual voice gains
      const baseAmplitudes = this.voices.map(() => 0.5 + Math.random() * 0.5);
      const baseGain = 0.1;
      const originalAmplitudes = baseAmplitudes.map(amp => baseGain * amp);
      const compensatedAmplitudes = this.voices.map((voice, index) => 
        originalAmplitudes[index] * voice.compensationGain
      );
      
      if (this.onVisualizationUpdate) {
        this.onVisualizationUpdate({
          frequencies,
          originalAmplitudes,
          compensatedAmplitudes,
          timestamp: currentTime
        });
      }
      
      this.animationId = requestAnimationFrame(updateVisualization);
    };
    
    updateVisualization();
  }

  public getCurrentPhase(): DeepNotePhase {
    return this.phase;
  }

  public getElapsedTime(): number {
    if (this.phase === 'idle') return 0;
    return this.audioContext.currentTime - this.startTime;
  }
}
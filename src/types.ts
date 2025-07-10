export interface DeepNoteVoice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  startFrequency: number;
  targetFrequency: number;
  currentFrequency: number;
  compensationGain: number;
}

export interface DeepNoteConfig {
  voiceCount: number;
  minStartFreq: number;
  maxStartFreq: number;
  chaosDuration: number; // in seconds
  convergeDuration: number; // in seconds
  sampleRate: number;
}

export interface AudioVisualization {
  frequencies: number[];
  originalAmplitudes: number[];
  compensatedAmplitudes: number[];
  timestamp: number;
}

export type DeepNotePhase = 'idle' | 'chaos' | 'converge' | 'sustain';
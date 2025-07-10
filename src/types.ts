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
  sustainDuration: number; // in seconds
  fadeDuration: number; // in seconds
  sampleRate: number;
}

export interface FrequencyPoint {
  time: number;
  frequency: number;
}

export interface AudioVisualization {
  frequencies: number[];
  currentFrequencies: number[];
  frequencyHistory: FrequencyPoint[][];
  currentTime: number;
  totalDuration: number;
  timestamp: number;
}

export type DeepNotePhase = 'idle' | 'chaos' | 'converge' | 'sustain';
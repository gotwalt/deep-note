/**
 * THX Deep Note TypeScript Type Definitions
 * 
 * This file contains all the core data structures used by the synthesizer
 * and visualization system.
 * 
 * @author Vibe-coded experiment with Claude AI
 */

/**
 * Represents a single voice in the 30-voice ensemble
 * 
 * Each voice is an independent oscillator that starts at a random frequency
 * and converges to a specific target frequency in the D major chord.
 */
export interface DeepNoteVoice {
  /** Web Audio oscillator node generating the sawtooth wave */
  oscillator: OscillatorNode;
  
  /** Individual gain control for this voice (includes compensation) */
  gainNode: GainNode;
  
  /** Random starting frequency (200-400Hz range) */
  startFrequency: number;
  
  /** Final target frequency (D major chord tone) */
  targetFrequency: number;
  
  /** Current real-time frequency (used for visualization) */
  currentFrequency: number;
  
  /** Equal loudness compensation multiplier (1.0-3.0x) */
  compensationGain: number;
}

/**
 * Configuration parameters for the synthesizer
 * 
 * Controls timing, frequency ranges, and voice count.
 * All duration values are in seconds.
 */
export interface DeepNoteConfig {
  /** Number of simultaneous voices (default: 30) */
  voiceCount: number;
  
  /** Minimum random starting frequency in Hz (default: 200) */
  minStartFreq: number;
  
  /** Maximum random starting frequency in Hz (default: 400) */
  maxStartFreq: number;
  
  /** Duration of chaos phase in seconds (default: 4) */
  chaosDuration: number;
  
  /** Duration of convergence phase in seconds (default: 3) */
  convergeDuration: number;
  
  /** Audio sample rate in Hz (default: 44100) */
  sampleRate: number;
}

/**
 * Single data point for frequency visualization
 * 
 * Used to build the time-series line chart showing frequency evolution.
 */
export interface FrequencyPoint {
  /** Time since synthesis start in seconds */
  time: number;
  
  /** Frequency value in Hz */
  frequency: number;
}

/**
 * Complete visualization data package
 * 
 * Contains all information needed to render the real-time line chart,
 * including frequency history, timing, and current state.
 */
export interface AudioVisualization {
  /** Target frequencies for each voice (D major chord tones) */
  frequencies: number[];
  
  /** Current real-time frequencies for each voice */
  currentFrequencies: number[];
  
  /** Complete frequency history for line chart (array per voice) */
  frequencyHistory: FrequencyPoint[][];
  
  /** Current playback time in seconds */
  currentTime: number;
  
  /** Total synthesis duration in seconds */
  totalDuration: number;
  
  /** Audio context timestamp for synchronization */
  timestamp: number;
}

/**
 * Synthesis phases
 * 
 * Tracks the current stage of the Deep Note progression:
 * - idle: Not playing
 * - chaos: Random frequencies, gradual fade-in
 * - converge: Smooth transition to target frequencies
 * - sustain: Holding final D major chord
 */
export type DeepNotePhase = 'idle' | 'chaos' | 'converge' | 'sustain';
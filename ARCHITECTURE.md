# THX Deep Note - Code Architecture Documentation

## Overview

This document explains how the THX Deep Note synthesizer works under the hood, covering the audio synthesis engine, visualization system, and equal loudness compensation.

## Core Architecture

### 1. Audio Synthesis Engine (`deepNote.ts`)

The `DeepNoteSynthesizer` class is the heart of the system:

```typescript
export class DeepNoteSynthesizer {
  private audioContext: AudioContext;
  private voices: DeepNoteVoice[] = [];
  private masterGain: GainNode;
  private config: DeepNoteConfig;
  // ... other properties
}
```

#### Voice Management

Each voice represents one oscillator in the 30-voice ensemble:

```typescript
interface DeepNoteVoice {
  oscillator: OscillatorNode;     // Web Audio oscillator
  gainNode: GainNode;             // Individual voice volume control
  startFrequency: number;         // Random starting frequency (200-400Hz)
  targetFrequency: number;        // Final chord tone frequency
  currentFrequency: number;       // Real-time frequency value
  compensationGain: number;       // Equal loudness adjustment
}
```

#### Frequency Scheduling

The core innovation is smooth frequency interpolation during convergence:

```typescript
private scheduleFrequencyConvergence(startTime: number, endTime: number): void {
  const updateInterval = 0.01; // 10ms precision
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
```

**Key Points:**
- Uses cosine-based easing for natural sound transitions
- 10ms update intervals for smooth frequency sweeps
- Each voice follows its own trajectory from random start to chord target

### 2. Equal Loudness Compensation

Human hearing sensitivity varies by frequency. The compensation algorithm boosts frequencies that sound quieter:

```typescript
private calculateCompensationGain(frequency: number): number {
  const f = Math.max(20, Math.min(20000, frequency));
  
  if (f < 100) {
    gain = 3.0;      // Very low frequencies need significant boost
  } else if (f < 200) {
    gain = 2.0;      // Low frequencies need moderate boost
  } else if (f < 500) {
    gain = 1.5;      // Lower mids need slight boost
  } else if (f < 2000) {
    gain = 1.0;      // Mid frequencies are reference (no change)
  } else if (f < 5000) {
    gain = 1.2;      // Upper mids need slight boost
  } else {
    gain = 1.5;      // High frequencies need moderate boost
  }
  
  return gain;
}
```

**Application:**
```typescript
// Applied during voice initialization and gain scheduling
const compensatedGain = baseGain * voice.compensationGain;
voice.gainNode.gain.exponentialRampToValueAtTime(compensatedGain, time);
```

### 3. Visualization System (`main.ts`)

#### Real-time Data Collection

The synthesizer tracks frequency history for visualization:

```typescript
// In startVisualization()
const currentFrequencies = this.voices.map(voice => {
  if (this.phase === 'chaos') {
    return voice.startFrequency;
  } else if (this.phase === 'converge') {
    // Calculate interpolated frequency based on convergence progress
    const convergeProgress = (elapsed - this.config.chaosDuration) / this.config.convergeDuration;
    const easedProgress = 0.5 * (1 - Math.cos(Math.PI * convergeProgress));
    const freqDiff = voice.targetFrequency - voice.startFrequency;
    return voice.startFrequency + (freqDiff * easedProgress);
  } else {
    return voice.targetFrequency;
  }
});

// Store history for line chart
currentFrequencies.forEach((freq, index) => {
  this.frequencyHistory[index].push({
    time: elapsed,
    frequency: freq
  });
});
```

#### Line Chart Rendering

The visualization uses logarithmic frequency scaling to match musical perception:

```typescript
private freqToLogY(freq: number, minFreq: number, maxFreq: number): number {
  return Math.log(freq / minFreq) / Math.log(maxFreq / minFreq);
}
```

**Color Coding by Chord Tones:**
```typescript
private getFrequencyColor(targetFreq: number): string {
  const D_notes = [73.42, 146.83, 293.66, 587.33, 1174.66];
  const Fs_notes = [92.50, 185.00, 369.99, 739.99, 1479.98];
  const A_notes = [110.00, 220.00, 440.00, 880.00, 1760.00];
  
  if (D_notes.some(freq => Math.abs(freq - targetFreq) < 1)) {
    return '#ff6b6b'; // Red for D notes
  } else if (Fs_notes.some(freq => Math.abs(freq - targetFreq) < 1)) {
    return '#4ecdc4'; // Teal for F# notes  
  } else if (A_notes.some(freq => Math.abs(freq - targetFreq) < 1)) {
    return '#45b7d1'; // Blue for A notes
  }
  return '#95a5a6'; // Gray fallback
}
```

## Data Flow

```
1. User clicks "Play"
   ↓
2. DeepNoteSynthesizer.start()
   ↓
3. initializeVoices() - Create 30 oscillators with random start frequencies
   ↓
4. scheduleAudioEvents() - Set up gain envelopes with compensation
   ↓
5. scheduleFrequencyConvergence() - Program smooth frequency transitions
   ↓
6. startVisualization() - Begin real-time data collection
   ↓
7. updateVisualization() - Draw line chart frame by frame
   ↓
8. scheduleEnding() - Fade out and stop after total duration
```

## Configuration System

All timing and behavior is configurable via `DeepNoteConfig`:

```typescript
interface DeepNoteConfig {
  voiceCount: number;           // Number of oscillators (default: 30)
  minStartFreq: number;         // Random start range min (default: 200Hz)
  maxStartFreq: number;         // Random start range max (default: 400Hz)
  chaosDuration: number;        // Chaos phase length (default: 4s)
  convergeDuration: number;     // Convergence phase length (default: 3s)
  sustainDuration: number;      // Sustain phase length (default: 4s)
  fadeDuration: number;         // Fade out length (default: 1s)
  sampleRate: number;           // Audio sample rate (default: 44100Hz)
}
```

**Total Duration Calculation:**
```typescript
public getTotalDuration(): number {
  return this.config.chaosDuration + this.config.convergeDuration + 
         this.config.sustainDuration + this.config.fadeDuration;
}
```

## Phase Management

The synthesizer tracks four distinct phases:

```typescript
type DeepNotePhase = 'idle' | 'chaos' | 'converge' | 'sustain';

// Phase transitions based on elapsed time
if (elapsed > this.config.chaosDuration + this.config.convergeDuration) {
  this.phase = 'sustain';
} else if (elapsed > this.config.chaosDuration) {
  this.phase = 'converge';
}
```

## Performance Considerations

- **Frequency Updates**: 10ms intervals (100 updates/second) for smooth transitions
- **Visualization**: RequestAnimationFrame for 60fps rendering
- **Memory**: Frequency history is cleared on stop to prevent memory leaks
- **Audio Context**: Proper cleanup of oscillators and gain nodes

## Browser Compatibility

Uses modern Web Audio API features:
- `OscillatorNode` for synthesis
- `GainNode` for volume control  
- `exponentialRampToValueAtTime()` for natural-sounding fades
- `setValueAtTime()` for precise frequency scheduling

## Mathematical Foundations

### Frequency Convergence Curve
The easing function creates smooth, natural transitions:
```
easedProgress = 0.5 * (1 - cos(π * linearProgress))
```
This S-curve starts slow, accelerates in the middle, then slows as it approaches the target.

### Logarithmic Frequency Display
Musical frequencies follow logarithmic relationships (octaves). The visualization uses:
```
logPosition = log(frequency / minFreq) / log(maxFreq / minFreq)
```

### Equal Loudness Compensation
Based on psychoacoustic research showing human hearing sensitivity curves. Lower frequencies require more amplitude to sound equally loud as mid-range frequencies.

## Extension Points

The architecture supports easy extensions:

1. **Custom Chord Progressions**: Modify `targetFrequencies` array
2. **Different Waveforms**: Change `oscillator.type` from 'sawtooth'
3. **Effects Processing**: Add nodes between oscillators and master gain
4. **Alternative Visualizations**: Replace line chart with spectrograms, 3D plots, etc.
5. **MIDI Input**: Map MIDI controllers to parameters
6. **Recording**: Add MediaRecorder API integration

---

*This documentation covers the core architecture. For specific implementation details, see the inline code comments.*
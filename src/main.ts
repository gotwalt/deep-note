import { DeepNoteSynthesizer } from './deepNote.js';
import { AudioVisualization } from './types.js';

/**
 * THX Deep Note Application Controller
 * 
 * Manages the user interface, controls the synthesizer, and renders
 * the real-time frequency visualization as an interactive line chart.
 * 
 * Features:
 * - Play/stop controls with proper state management
 * - Real-time phase and timing displays
 * - Frequency line chart with logarithmic scaling
 * - Color-coded visualization by chord tones (D, F#, A)
 * - Responsive canvas rendering with proper DPI handling
 * 
 * @author Vibe-coded experiment with Claude AI
 */
class DeepNoteApp {
  private synthesizer: DeepNoteSynthesizer;
  private playBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private phaseText!: HTMLElement;
  private phaseProgress!: HTMLElement;
  private timeText!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private isPlaying: boolean = false;

  constructor() {
    this.synthesizer = new DeepNoteSynthesizer();
    this.initializeElements();
    this.setupEventListeners();
    this.setupCanvas();
    this.synthesizer.setVisualizationCallback(this.updateVisualization.bind(this));
  }

  private initializeElements(): void {
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.phaseText = document.getElementById('phaseText') as HTMLElement;
    this.phaseProgress = document.getElementById('phaseProgress') as HTMLElement;
    this.timeText = document.getElementById('timeText') as HTMLElement;
    this.canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
  }

  private setupEventListeners(): void {
    this.playBtn.addEventListener('click', () => this.play());
    this.stopBtn.addEventListener('click', () => this.stop());
  }

  private setupCanvas(): void {
    // Set up high DPI canvas
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  private async play(): Promise<void> {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playBtn.disabled = true;
    this.stopBtn.disabled = false;

    try {
      await this.synthesizer.start();
      this.startStatusUpdates();
    } catch (error) {
      console.error('Error starting synthesizer:', error);
      this.stop();
    }
  }

  private stop(): void {
    this.isPlaying = false;
    this.playBtn.disabled = false;
    this.stopBtn.disabled = true;
    
    this.synthesizer.stop();
    this.resetStatus();
    this.clearVisualization();
  }

  private startStatusUpdates(): void {
    const updateStatus = () => {
      if (!this.isPlaying) return;

      const phase = this.synthesizer.getCurrentPhase();
      const elapsed = this.synthesizer.getElapsedTime();
      
      this.updatePhaseDisplay(phase, elapsed);
      this.updateTimeDisplay(elapsed);
      
      // Check if synthesizer stopped itself (phase became 'idle')
      if (phase === 'idle') {
        this.stop(); // Reset UI state
        return;
      }
      
      requestAnimationFrame(updateStatus);
    };

    updateStatus();
  }

  private updatePhaseDisplay(phase: string, elapsed: number): void {
    const phaseNames = {
      'idle': 'Ready',
      'chaos': 'Chaos Phase',
      'converge': 'Converging',
      'sustain': 'Sustaining'
    };

    this.phaseText.textContent = phaseNames[phase as keyof typeof phaseNames] || 'Unknown';
    
    // Update progress bar
    const totalDuration = 7; // 4 seconds chaos + 3 seconds converge
    const progress = Math.min(elapsed / totalDuration, 1) * 100;
    this.phaseProgress.style.width = `${progress}%`;
  }

  private updateTimeDisplay(elapsed: number): void {
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    this.timeText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private resetStatus(): void {
    this.phaseText.textContent = 'Ready';
    this.phaseProgress.style.width = '0%';
    this.timeText.textContent = '0:00';
  }

  private updateVisualization(data: AudioVisualization): void {
    const { frequencies, frequencyHistory, currentTime, totalDuration } = data;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw frequency line chart
    this.drawFrequencyLineChart(frequencyHistory, frequencies, currentTime, totalDuration, width, height);
  }
  
  /**
   * Render the main frequency line chart visualization
   * 
   * Creates a time-series line chart showing how each voice's frequency
   * evolves from chaos to the final D major chord. Uses logarithmic
   * frequency scaling to match musical perception.
   * 
   * Chart elements:
   * - X-axis: Time (0 to total duration)
   * - Y-axis: Frequency (70Hz to 1800Hz, logarithmic scale)
   * - Lines: One per voice, color-coded by target chord tone
   * - Grid: Horizontal lines at target frequencies, vertical at time intervals
   * - Indicator: Current playback time as vertical white line
   * 
   * @param frequencyHistory - Array of frequency point arrays, one per voice
   * @param targetFrequencies - Final chord frequencies for color coding
   * @param currentTime - Current playback time in seconds
   * @param totalDuration - Total synthesis duration in seconds
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   */
  private drawFrequencyLineChart(frequencyHistory: any[][], targetFrequencies: number[], currentTime: number, totalDuration: number, width: number, height: number): void {
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Frequency range (logarithmic)
    const minFreq = 70;
    const maxFreq = 1800;
    
    // Draw grid and labels first
    this.drawFrequencyGrid(margin, chartWidth, chartHeight, totalDuration, minFreq, maxFreq);
    
    // Draw frequency lines for each voice
    frequencyHistory.forEach((history, voiceIndex) => {
      if (history.length < 2) return;
      
      const targetFreq = targetFrequencies[voiceIndex];
      const color = this.getFrequencyColor(targetFreq);
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.5;
      this.ctx.globalAlpha = 0.7;
      
      this.ctx.beginPath();
      history.forEach((point, index) => {
        const x = margin.left + (point.time / totalDuration) * chartWidth;
        const y = margin.top + chartHeight - (this.freqToLogY(point.frequency, minFreq, maxFreq) * chartHeight);
        
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.stroke();
    });
    
    this.ctx.globalAlpha = 1.0;
    
    // Draw current time indicator
    this.drawTimeIndicator(currentTime, totalDuration, margin, chartWidth, chartHeight);
  }

  private freqToLogY(freq: number, minFreq: number, maxFreq: number): number {
    return Math.log(freq / minFreq) / Math.log(maxFreq / minFreq);
  }
  
  private getFrequencyColor(targetFreq: number): string {
    // Color code by note type in the D major chord
    const D_notes = [73.42, 146.83, 293.66, 587.33, 1174.66];
    const Fs_notes = [92.50, 185.00, 369.99, 739.99, 1479.98];
    const A_notes = [110.00, 220.00, 440.00, 880.00, 1760.00];
    
    if (D_notes.some(freq => Math.abs(freq - targetFreq) < 1)) {
      return '#ff6b6b'; // Red for D notes
    } else if (Fs_notes.some(freq => Math.abs(freq - targetFreq) < 1)) {
      return '#4ecdc4'; // Teal for F# notes  
    } else if (A_notes.some(freq => Math.abs(freq - targetFreq) < 1)) {
      return '#45b7d1'; // Blue for A notes
    } else {
      return '#95a5a6'; // Gray for others
    }
  }
  
  private drawFrequencyGrid(margin: any, chartWidth: number, chartHeight: number, totalDuration: number, minFreq: number, maxFreq: number): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Horizontal grid lines (frequencies)
    const noteFreqs = [73.42, 92.50, 110.00, 146.83, 185.00, 220.00, 293.66, 369.99, 440.00, 587.33, 739.99, 880.00, 1174.66, 1479.98, 1760.00];
    noteFreqs.forEach(freq => {
      const y = margin.top + chartHeight - (this.freqToLogY(freq, minFreq, maxFreq) * chartHeight);
      
      this.ctx.beginPath();
      this.ctx.moveTo(margin.left, y);
      this.ctx.lineTo(margin.left + chartWidth, y);
      this.ctx.stroke();
      
      // Frequency labels
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${Math.round(freq)}Hz`, margin.left - 10, y + 4);
    });
    
    // Vertical grid lines (time)
    for (let t = 0; t <= totalDuration; t += 2) {
      const x = margin.left + (t / totalDuration) * chartWidth;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, margin.top);
      this.ctx.lineTo(x, margin.top + chartHeight);
      this.ctx.stroke();
      
      // Time labels
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${t}s`, x, margin.top + chartHeight + 20);
    }
  }
  
  private drawTimeIndicator(currentTime: number, totalDuration: number, margin: any, chartWidth: number, chartHeight: number): void {
    const x = margin.left + (currentTime / totalDuration) * chartWidth;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, margin.top);
    this.ctx.lineTo(x, margin.top + chartHeight);
    this.ctx.stroke();
  }
  
  private clearVisualization(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(0, 0, width, height);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DeepNoteApp();
});
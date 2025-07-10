import { DeepNoteSynthesizer } from './deepNote.js';
import { AudioVisualization } from './types.js';

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
    const { frequencies, originalAmplitudes, compensatedAmplitudes } = data;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, width, height);
    
    // Split canvas into two sections
    const sectionHeight = height / 2;
    const barWidth = width / frequencies.length;
    
    frequencies.forEach((freq, index) => {
      const x = index * barWidth;
      const normalizedFreq = (freq - 200) / (2000 - 200); // Normalize to 0-1
      
      // Original amplitudes (top section) - Red tones
      const originalBarHeight = originalAmplitudes[index] * sectionHeight * 8; // Much larger scale
      const originalY = sectionHeight - originalBarHeight;
      
      this.ctx.fillStyle = `hsla(0, 80%, 60%, 0.8)`; // Red for original
      this.ctx.fillRect(x, originalY, barWidth - 1, originalBarHeight);
      
      // Compensated amplitudes (bottom section) - Green tones
      const compensatedBarHeight = compensatedAmplitudes[index] * sectionHeight * 2; // Larger scale for compensation
      const compensatedY = height - compensatedBarHeight;
      
      this.ctx.fillStyle = `hsla(120, 80%, 60%, 0.8)`; // Green for compensated
      this.ctx.fillRect(x, compensatedY, barWidth - 1, compensatedBarHeight);
    });
    
    // Draw section divider
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, sectionHeight);
    this.ctx.lineTo(width, sectionHeight);
    this.ctx.stroke();
    
    // Draw frequency grid lines for both sections
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    
    const gridFreqs = [200, 400, 800, 1600];
    gridFreqs.forEach(freq => {
      const normalizedFreq = (freq - 200) / (2000 - 200);
      
      // Top section grid lines
      const topY = sectionHeight - (normalizedFreq * sectionHeight * 0.8);
      this.ctx.beginPath();
      this.ctx.moveTo(0, topY);
      this.ctx.lineTo(width, topY);
      this.ctx.stroke();
      
      // Bottom section grid lines  
      const bottomY = height - (normalizedFreq * sectionHeight * 0.8);
      this.ctx.beginPath();
      this.ctx.moveTo(0, bottomY);
      this.ctx.lineTo(width, bottomY);
      this.ctx.stroke();
    });
  }

  private clearVisualization(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, width, height);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DeepNoteApp();
});
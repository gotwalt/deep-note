# THX Deep Note Synthesizer

An interactive web-based recreation of the iconic THX "Deep Note" audio logo, featuring real-time frequency visualization and equal loudness compensation.

## About

This project recreates the famous THX Deep Note - that dramatic crescendo you hear before movies that starts with chaos and resolves into a powerful D major chord. The synthesizer accurately models the original's behavior while adding modern enhancements like equal loudness compensation and real-time visualization.

**This is a vibe-coded experiment created with help from Claude AI.**

## Features

- **Authentic THX Deep Note synthesis** - 30 voices starting at random frequencies (200-400Hz) that converge into a D major chord across 5 octaves
- **Equal loudness compensation** - Psychoacoustic processing ensures all frequencies sound equally loud to human ears
- **Real-time frequency visualization** - Interactive line chart showing the chaos-to-order transition over time
- **Hot-reload development** - Modern Vite-based development setup with TypeScript
- **Responsive design** - Works on desktop and mobile browsers

## Demo

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev`
4. Open your browser to `http://localhost:5173`
5. Click "Play Deep Note" and watch the magic happen!

## How It Works

The THX Deep Note follows a specific mathematical and acoustic structure with configurable timing:

### Phase 1: Chaos (0-4 seconds)
- 30 oscillators start at random frequencies between 200-400Hz
- Sawtooth waveforms create the rich harmonic content
- Voices fade in with slight randomization to avoid phasing

### Phase 2: Convergence (4-7 seconds)  
- Frequencies smoothly interpolate toward target D major chord tones
- Uses cosine-based easing for natural-sounding transitions
- Equal loudness compensation is applied to balance perceived volume

### Phase 3: Sustain (variable duration)
- All voices lock to their final frequencies forming a perfect D major chord
- Frequencies span 5 octaves: D2 (73Hz) to A6 (1760Hz)
- Chord tones: D, F#, A repeated across octaves
- Duration = total duration - chaos duration - convergence duration - fade duration

### Phase 4: Fade (configurable)
- Exponential fade-out for natural ending
- Preserves harmonic relationships during fade
- Default 1 second, but can be customized

## Flexible Duration

The synthesizer supports configurable duration and fade-out timing:

```javascript
// Default timing (12 seconds total, 1 second fade)
synthesizer.play();

// Short version (8 seconds total, 0.5 second fade)
synthesizer.play(8, 0.5);

// Long cinematic version (30 seconds total, 3 second fade)
synthesizer.play(30, 3);
```

The visualization automatically adjusts to show the correct time scale on the X-axis.

## Equal Loudness Compensation

Human hearing perceives different frequencies at different loudness levels. The synthesizer applies frequency-dependent gain adjustments based on equal loudness curves:

- **Very low frequencies (< 100Hz)**: 3x boost
- **Low frequencies (100-200Hz)**: 2x boost  
- **Lower mids (200-500Hz)**: 1.5x boost
- **Mid frequencies (500-2000Hz)**: No adjustment (reference)
- **High frequencies (> 2000Hz)**: 1.2-1.5x boost

This ensures the deep bass notes sound as prominent as the mid-range frequencies.

## Visualization

The real-time line chart shows:
- **X-axis**: Time (0-12 seconds)
- **Y-axis**: Frequency (70Hz-1800Hz, logarithmic scale)
- **Color coding**: Red (D notes), Teal (F# notes), Blue (A notes)
- **Current time indicator**: White vertical line
- **Frequency grid**: Horizontal lines at target chord frequencies

## Technology Stack

- **TypeScript** - Type-safe JavaScript with modern ES modules
- **Web Audio API** - Real-time audio synthesis and processing
- **HTML5 Canvas** - Custom visualization rendering
- **Vite** - Fast development server with hot module replacement
- **CSS3** - Modern styling with gradients and animations

## Project Structure

```
src/
├── main.ts          # Main application and UI logic
├── deepNote.ts      # Core synthesizer implementation
├── types.ts         # TypeScript type definitions
├── index.html       # HTML structure
└── styles.css       # Styling and layout

Key Classes:
- DeepNoteSynthesizer: Core audio synthesis engine
- DeepNoteApp: UI controller and visualization renderer
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview
```

## Browser Support

Requires a modern browser with Web Audio API support:
- Chrome 14+
- Firefox 25+
- Safari 6+
- Edge 12+

## Credits

- **Original THX Deep Note**: Created by Andy Moorer at Lucasfilm (1983)
- **This Implementation**: Vibe-coded experiment with help from Claude AI
- **Equal Loudness Curves**: Based on ISO 226:2003 standard

## License

MIT License - Feel free to experiment and build upon this code!

---

*Experience the power of organized sound. 🎵*
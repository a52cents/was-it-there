const TAU = Math.PI * 2;
const WAVE_TABLE_SIZE = 4_096;
const WAVE_TABLE_MASK = WAVE_TABLE_SIZE - 1;
const MASTER_PEAK = 0.82;
const MAXIMUM_RENDER_SAMPLE_RATE = 8_000;

export const PROCEDURAL_HORROR_SCORE_DURATION_SECONDS = 84;

interface PianoNote {
  readonly startsAt: number;
  readonly midi: number;
  readonly duration: number;
  readonly velocity: number;
  readonly pan: number;
}

interface DronePassage {
  readonly startsAt: number;
  readonly duration: number;
  readonly midiNotes: readonly number[];
  readonly volume: number;
}

interface GlassTone {
  readonly startsAt: number;
  readonly midi: number;
  readonly duration: number;
  readonly volume: number;
  readonly pan: number;
}

interface NoiseSwell {
  readonly startsAt: number;
  readonly duration: number;
  readonly volume: number;
  readonly pan: number;
}

// "Ce qui demeure" — an original four-part score. The deliberately uneven
// entrances prevent the ear from reducing the piece to a short repeating cell.
const PIANO_NOTES: readonly PianoNote[] = [
  // I. La pièce vide
  { startsAt: 1.3, midi: 38, duration: 5.8, velocity: 0.72, pan: -0.16 },
  { startsAt: 5.1, midi: 45, duration: 4.4, velocity: 0.44, pan: 0.2 },
  { startsAt: 8.4, midi: 51, duration: 4.8, velocity: 0.5, pan: -0.08 },
  { startsAt: 12.6, midi: 50, duration: 5.4, velocity: 0.62, pan: 0.12 },
  { startsAt: 16.1, midi: 44, duration: 4.2, velocity: 0.39, pan: -0.2 },
  { startsAt: 19.3, midi: 57, duration: 3.8, velocity: 0.36, pan: 0.24 },
  { startsAt: 21.8, midi: 51, duration: 4.7, velocity: 0.52, pan: -0.12 },

  // II. Quelque chose a changé
  { startsAt: 24.2, midi: 37, duration: 5.6, velocity: 0.76, pan: -0.18 },
  { startsAt: 25.5, midi: 45, duration: 4.8, velocity: 0.43, pan: 0.16 },
  { startsAt: 28.3, midi: 50, duration: 4.1, velocity: 0.57, pan: -0.04 },
  { startsAt: 31.6, midi: 51, duration: 4.3, velocity: 0.6, pan: 0.18 },
  { startsAt: 34.9, midi: 48, duration: 4.5, velocity: 0.46, pan: -0.23 },
  { startsAt: 36.4, midi: 54, duration: 4.2, velocity: 0.47, pan: 0.24 },
  { startsAt: 39.7, midi: 38, duration: 5.3, velocity: 0.82, pan: -0.14 },
  { startsAt: 41.1, midi: 56, duration: 3.8, velocity: 0.5, pan: 0.16 },

  // III. Derrière soi — the pulse accelerates, but never settles into a beat.
  { startsAt: 44.1, midi: 38, duration: 3.8, velocity: 0.82, pan: -0.2 },
  { startsAt: 45.0, midi: 45, duration: 3.1, velocity: 0.48, pan: 0.22 },
  { startsAt: 47.0, midi: 51, duration: 3.4, velocity: 0.66, pan: -0.1 },
  { startsAt: 48.6, midi: 50, duration: 3.1, velocity: 0.6, pan: 0.14 },
  { startsAt: 51.2, midi: 41, duration: 4.1, velocity: 0.76, pan: -0.22 },
  { startsAt: 52.3, midi: 49, duration: 3.2, velocity: 0.53, pan: 0.18 },
  { startsAt: 54.2, midi: 50, duration: 3.5, velocity: 0.71, pan: -0.07 },
  { startsAt: 56.7, midi: 44, duration: 3.7, velocity: 0.78, pan: 0.2 },
  { startsAt: 57.7, midi: 45, duration: 3.2, velocity: 0.5, pan: -0.16 },
  { startsAt: 59.4, midi: 51, duration: 3.1, velocity: 0.7, pan: 0.11 },
  { startsAt: 61.8, midi: 48, duration: 3.7, velocity: 0.68, pan: -0.2 },
  { startsAt: 62.8, midi: 54, duration: 3.2, velocity: 0.56, pan: 0.22 },

  // IV. Ce qui demeure — low tolls and close semitone clusters.
  { startsAt: 65.2, midi: 38, duration: 5.8, velocity: 0.94, pan: -0.18 },
  { startsAt: 65.2, midi: 50, duration: 4.8, velocity: 0.57, pan: 0.08 },
  { startsAt: 65.2, midi: 57, duration: 4.5, velocity: 0.41, pan: 0.24 },
  { startsAt: 69.1, midi: 39, duration: 5.2, velocity: 0.83, pan: 0.18 },
  { startsAt: 69.1, midi: 46, duration: 4.4, velocity: 0.48, pan: -0.16 },
  { startsAt: 72.5, midi: 37, duration: 5.4, velocity: 0.91, pan: -0.2 },
  { startsAt: 72.5, midi: 44, duration: 4.8, velocity: 0.55, pan: 0.2 },
  { startsAt: 75.6, midi: 38, duration: 6.2, velocity: 1, pan: -0.1 },
  { startsAt: 76.1, midi: 50, duration: 4.5, velocity: 0.63, pan: 0.08 },
  { startsAt: 76.1, midi: 51, duration: 4.3, velocity: 0.56, pan: 0.22 },
  { startsAt: 79.5, midi: 26, duration: 4.2, velocity: 0.84, pan: -0.05 },
  { startsAt: 80.3, midi: 50, duration: 3.2, velocity: 0.27, pan: -0.18 },
  { startsAt: 80.3, midi: 51, duration: 3.2, velocity: 0.25, pan: 0.18 },
];

const DRONE_PASSAGES: readonly DronePassage[] = [
  { startsAt: 0, duration: 26, midiNotes: [26, 33], volume: 0.045 },
  { startsAt: 20, duration: 28, midiNotes: [26, 27, 33], volume: 0.04 },
  { startsAt: 42, duration: 25, midiNotes: [25, 26, 32], volume: 0.046 },
  { startsAt: 61, duration: 23, midiNotes: [26, 33, 39], volume: 0.052 },
];

const GLASS_TONES: readonly GlassTone[] = [
  { startsAt: 14.2, midi: 75, duration: 8.5, volume: 0.023, pan: 0.5 },
  { startsAt: 29.8, midi: 68, duration: 9.6, volume: 0.027, pan: -0.52 },
  { startsAt: 38.3, midi: 69, duration: 7.8, volume: 0.022, pan: 0.42 },
  { startsAt: 52.1, midi: 74, duration: 9.2, volume: 0.03, pan: -0.46 },
  { startsAt: 63.2, midi: 63, duration: 10.8, volume: 0.034, pan: 0.5 },
  { startsAt: 70.4, midi: 62, duration: 10.5, volume: 0.032, pan: -0.48 },
];

const NOISE_SWELLS: readonly NoiseSwell[] = [
  { startsAt: 18.1, duration: 4.6, volume: 0.024, pan: -0.5 },
  { startsAt: 34.8, duration: 5.2, volume: 0.028, pan: 0.45 },
  { startsAt: 47.8, duration: 4.1, volume: 0.031, pan: -0.35 },
  { startsAt: 59.6, duration: 5.8, volume: 0.036, pan: 0.38 },
  { startsAt: 72.1, duration: 5.2, volume: 0.042, pan: -0.22 },
];

const SUB_PULSE_TIMES: readonly number[] = [
  43.4, 45.2, 47.7, 49.1, 51.9, 54.2, 55.6, 58.4, 60.1, 63.3, 65.4,
  67.1, 69.8, 71.2, 73.9, 76.4,
];

export function createProceduralHorrorScore(context: Pick<AudioContext, 'createBuffer' | 'sampleRate'>): AudioBuffer {
  // The deliberately dark arrangement contains no useful ultrasonic content.
  // Rendering at 8 kHz keeps first-play generation and memory use lightweight;
  // AudioBufferSourceNode resamples it to the hardware context on playback.
  const sampleRate = Math.min(context.sampleRate, MAXIMUM_RENDER_SAMPLE_RATE);
  const frameCount = Math.max(
    1,
    Math.floor(
      sampleRate * PROCEDURAL_HORROR_SCORE_DURATION_SECONDS,
    ),
  );
  const buffer = context.createBuffer(2, frameCount, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const pianoWave = createWaveTable([1, 0.47, 0.24, 0.13, 0.07, 0.035]);
  const bowedWave = createWaveTable([1, 0.31, 0.16, 0.08]);
  const glassWave = createWaveTable([1, 0.12, 0.27, 0.04, 0.1]);

  for (const [index, note] of PIANO_NOTES.entries()) {
    renderPianoNote(left, right, sampleRate, note, index, pianoWave);
  }

  for (const passage of DRONE_PASSAGES) {
    renderDronePassage(
      left,
      right,
      sampleRate,
      passage,
      bowedWave,
    );
  }

  for (const tone of GLASS_TONES) {
    renderGlassTone(left, right, sampleRate, tone, glassWave);
  }

  for (const [index, swell] of NOISE_SWELLS.entries()) {
    renderNoiseSwell(left, right, sampleRate, swell, index);
  }

  for (const [index, startsAt] of SUB_PULSE_TIMES.entries()) {
    renderSubPulse(left, right, sampleRate, startsAt, index);
  }

  masterChannel(left, sampleRate);
  masterChannel(right, sampleRate);
  normalizeStereo(left, right);
  return buffer;
}

function renderPianoNote(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  note: PianoNote,
  noteIndex: number,
  wave: Float32Array,
): void {
  const startFrame = Math.floor(note.startsAt * sampleRate);
  const endFrame = Math.min(
    left.length,
    Math.floor((note.startsAt + note.duration) * sampleRate),
  );
  const frequency = midiToFrequency(note.midi);
  const phaseAdvance = (frequency / sampleRate) * WAVE_TABLE_SIZE;
  const leftGain = Math.sqrt((1 - note.pan) * 0.5);
  const rightGain = Math.sqrt((1 + note.pan) * 0.5);
  let noiseState = (0x9e3779b9 ^ Math.imul(noteIndex + 1, 0x85ebca6b)) >>> 0;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const elapsed = (frame - startFrame) / sampleRate;
    const attack = Math.min(1, elapsed / 0.009);
    const release = Math.min(1, (note.duration - elapsed) / 0.72);
    const decay = Math.exp(-elapsed * (0.5 + frequency / 1_400));
    const phase = elapsed * sampleRate * phaseAdvance;
    const struckString =
      ((wave[Math.floor(phase) & WAVE_TABLE_MASK] ?? 0) * 0.69 +
        (wave[Math.floor(phase * 1.0027) & WAVE_TABLE_MASK] ?? 0) * 0.31) *
      attack *
      Math.max(0, release) *
      decay;
    let hammer = 0;

    if (elapsed < 0.045) {
      noiseState =
        (Math.imul(noiseState, 1_664_525) + 1_013_904_223) >>> 0;
      hammer =
        (noiseState / 2_147_483_648 - 1) *
        Math.exp(-elapsed * 78) *
        0.16;
    }

    const value = (struckString + hammer) * note.velocity * 0.24;
    addSample(left, frame, value * leftGain);
    addSample(right, frame, value * rightGain);
  }
}

function renderDronePassage(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  passage: DronePassage,
  wave: Float32Array,
): void {
  const startFrame = Math.floor(passage.startsAt * sampleRate);
  const endFrame = Math.min(
    left.length,
    Math.floor((passage.startsAt + passage.duration) * sampleRate),
  );

  for (const [voiceIndex, midi] of passage.midiNotes.entries()) {
    const frequency = midiToFrequency(midi) * (1 + (voiceIndex - 1) * 0.0018);
    const phaseAdvance = (frequency / sampleRate) * WAVE_TABLE_SIZE;
    const pan = (voiceIndex / Math.max(1, passage.midiNotes.length - 1) - 0.5) * 0.9;
    const leftGain = Math.sqrt((1 - pan) * 0.5);
    const rightGain = Math.sqrt((1 + pan) * 0.5);

    for (let frame = startFrame; frame < endFrame; frame += 1) {
      const elapsed = (frame - startFrame) / sampleRate;
      const attack = Math.min(1, elapsed / 4.2);
      const release = Math.min(1, (passage.duration - elapsed) / 5.4);
      const bow = 0.83 + Math.sin(TAU * 0.071 * elapsed + voiceIndex * 1.7) * 0.17;
      const phase = elapsed * sampleRate * phaseAdvance;
      const value =
        (wave[Math.floor(phase) & WAVE_TABLE_MASK] ?? 0) *
        attack *
        Math.max(0, release) *
        bow *
        passage.volume;

      addSample(left, frame, value * leftGain);
      addSample(right, frame, value * rightGain);
    }
  }
}

function renderGlassTone(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  tone: GlassTone,
  wave: Float32Array,
): void {
  const startFrame = Math.floor(tone.startsAt * sampleRate);
  const endFrame = Math.min(
    left.length,
    Math.floor((tone.startsAt + tone.duration) * sampleRate),
  );
  const frequency = midiToFrequency(tone.midi);
  const phaseAdvance = (frequency / sampleRate) * WAVE_TABLE_SIZE;
  const leftGain = Math.sqrt((1 - tone.pan) * 0.5);
  const rightGain = Math.sqrt((1 + tone.pan) * 0.5);

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const elapsed = (frame - startFrame) / sampleRate;
    const attack = Math.min(1, elapsed / 2.8);
    const release = Math.min(1, (tone.duration - elapsed) / 2.3);
    const vibrato = Math.sin(TAU * 0.19 * elapsed) * 0.006;
    const phase = elapsed * sampleRate * phaseAdvance * (1 + vibrato);
    const value =
      (wave[Math.floor(phase) & WAVE_TABLE_MASK] ?? 0) *
      attack *
      Math.max(0, release) *
      tone.volume;

    addSample(left, frame, value * leftGain);
    addSample(right, frame, value * rightGain);
  }
}

function renderNoiseSwell(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  swell: NoiseSwell,
  swellIndex: number,
): void {
  const startFrame = Math.floor(swell.startsAt * sampleRate);
  const endFrame = Math.min(
    left.length,
    Math.floor((swell.startsAt + swell.duration) * sampleRate),
  );
  const leftGain = Math.sqrt((1 - swell.pan) * 0.5);
  const rightGain = Math.sqrt((1 + swell.pan) * 0.5);
  const smoothing = Math.min(1, 1_100 / sampleRate);
  let state = (0x6d2b79f5 ^ Math.imul(swellIndex + 11, 0x27d4eb2d)) >>> 0;
  let filteredNoise = 0;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const elapsed = (frame - startFrame) / sampleRate;
    const progress = elapsed / swell.duration;
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    const whiteNoise = state / 2_147_483_648 - 1;
    filteredNoise += (whiteNoise - filteredNoise) * smoothing;
    const envelope = Math.sin(Math.PI * Math.min(1, progress)) * progress;
    const value = filteredNoise * envelope * swell.volume;

    addSample(left, frame, value * leftGain);
    addSample(right, frame, value * rightGain);
  }
}

function renderSubPulse(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  startsAt: number,
  pulseIndex: number,
): void {
  const duration = pulseIndex % 4 === 3 ? 0.72 : 0.54;
  const startFrame = Math.floor(startsAt * sampleRate);
  const endFrame = Math.min(
    left.length,
    Math.floor((startsAt + duration) * sampleRate),
  );
  let phase = 0;

  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const elapsed = (frame - startFrame) / sampleRate;
    const progress = elapsed / duration;
    const frequency = 54 - progress * 22;
    phase += (frequency / sampleRate) * WAVE_TABLE_SIZE;
    const envelope = Math.sin(Math.PI * progress) * Math.exp(-elapsed * 3.4);
    const value = Math.sin((phase / WAVE_TABLE_SIZE) * TAU) * envelope * 0.09;

    addSample(left, frame, value * 0.7);
    addSample(right, frame, value * 0.7);
  }
}

function masterChannel(samples: Float32Array, sampleRate: number): void {
  let previousInput = 0;
  let previousOutput = 0;

  for (let frame = 0; frame < samples.length; frame += 1) {
    const input = samples[frame] ?? 0;
    const highPassed = input - previousInput + 0.997 * previousOutput;
    previousInput = input;
    previousOutput = highPassed;
    const seconds = frame / sampleRate;
    const fadeIn = Math.min(1, seconds / 2.2);
    const fadeOut = Math.min(
      1,
      (PROCEDURAL_HORROR_SCORE_DURATION_SECONDS - seconds) / 3.6,
    );
    const shaped = highPassed / (1 + Math.abs(highPassed) * 0.45);
    samples[frame] = shaped * fadeIn * Math.max(0, fadeOut);
  }
}

function normalizeStereo(left: Float32Array, right: Float32Array): void {
  let peak = 0;

  for (let frame = 0; frame < left.length; frame += 1) {
    peak = Math.max(
      peak,
      Math.abs(left[frame] ?? 0),
      Math.abs(right[frame] ?? 0),
    );
  }

  if (peak === 0) {
    return;
  }

  const scale = MASTER_PEAK / peak;

  for (let frame = 0; frame < left.length; frame += 1) {
    left[frame] = (left[frame] ?? 0) * scale;
    right[frame] = (right[frame] ?? 0) * scale;
  }
}

function createWaveTable(harmonics: readonly number[]): Float32Array {
  const wave = new Float32Array(WAVE_TABLE_SIZE);
  const amplitude = harmonics.reduce((sum, harmonic) => sum + harmonic, 0);

  for (let frame = 0; frame < wave.length; frame += 1) {
    const phase = (frame / wave.length) * TAU;
    let value = 0;

    for (const [index, harmonic] of harmonics.entries()) {
      value += Math.sin(phase * (index + 1)) * harmonic;
    }

    wave[frame] = value / amplitude;
  }

  return wave;
}

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function addSample(samples: Float32Array, frame: number, value: number): void {
  samples[frame] = (samples[frame] ?? 0) + value;
}

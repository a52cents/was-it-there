import {
  createProceduralHorrorScore,
} from './ProceduralHorrorScore';

export type AudioCategory =
  | 'master'
  | 'music'
  | 'ambience'
  | 'effects'
  | 'interface';

export const STORY_AUDIO_CUE_IDS = [
  'story-radio-burst',
  'story-photo-memory',
  'story-radio-message',
  'story-radio-search',
  'story-bathroom-pipes',
  'story-bathroom-warning',
  'story-bathroom-failure',
  'story-corridor-ring',
  'story-corridor-prediction',
  'story-corridor-failure',
  'story-office-radio-pattern',
  'story-office-radio-silence',
  'story-office-erased-name',
  'story-office-failure',
  'story-kitchen-reverse-breakfast',
  'story-kitchen-chair-scrape',
  'story-kitchen-failure',
  'story-dining-voices',
  'story-dining-memory-pulse',
  'story-dining-archive',
  'story-dining-failure',
  'story-living-tape-wind',
  'story-living-tape-click',
  'story-living-noah-voice',
  'story-living-memory-burst',
  'story-living-failure',
] as const;

export type StoryAudioCueId = (typeof STORY_AUDIO_CUE_IDS)[number];

export const AUDIO_CUE_IDS = [
  'game-soundtrack',
  'room-ambience',
  'blackout-cue',
  'lights-return',
  'report-correct',
  'report-incorrect',
  'house-calm',
  'house-pressure-1',
  'house-pressure-2',
  'house-takeover',
  'ambient-knock',
  'ambient-footsteps',
  'ambient-whisper',
  ...STORY_AUDIO_CUE_IDS,
  'door-unlock',
  'door-open',
] as const;

export type AudioCueId = (typeof AUDIO_CUE_IDS)[number];

export interface AudioManagerSnapshot {
  readonly contextState: AudioContextState | 'uninitialized';
  readonly muted: boolean;
  readonly activeCueIds: readonly AudioCueId[];
  readonly volumes: Readonly<Record<AudioCategory, number>>;
}

type RoutedAudioCategory = Exclude<AudioCategory, 'master'>;

interface ActiveCue {
  readonly sources: Set<AudioScheduledSourceNode>;
  readonly nodes: Set<AudioNode>;
}

const ROUTED_AUDIO_CATEGORIES: readonly RoutedAudioCategory[] = [
  'music',
  'ambience',
  'effects',
  'interface',
];

const DEFAULT_VOLUMES: Readonly<Record<AudioCategory, number>> = {
  master: 1,
  music: 0.5,
  ambience: 0.5,
  effects: 0.5,
  interface: 0.5,
};

const ROOM_TONE_SECONDS = 2;
const UINT32_RANGE = 4_294_967_296;

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly categoryGains = new Map<RoutedAudioCategory, GainNode>();
  private readonly volumes: Record<AudioCategory, number> = {
    ...DEFAULT_VOLUMES,
  };
  private readonly activeCues = new Map<AudioCueId, ActiveCue>();
  private horrorScoreBuffer: AudioBuffer | null = null;
  private ambientCueSequence = 0;
  private muted = false;
  private disposed = false;

  public constructor(
    private readonly createContext: () => AudioContext = () =>
      new AudioContext(),
  ) {}

  public async initialize(): Promise<void> {
    // AudioContext creation is deferred to unlock(), which must run from a
    // user gesture in browsers with autoplay protection.
  }

  public async unlock(): Promise<void> {
    if (this.disposed) {
      return;
    }

    if (this.context === null) {
      this.context = this.createContext();
      this.createMixer(this.context);
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  public play(id: AudioCueId): void {
    if (this.context === null || this.context.state !== 'running') {
      return;
    }

    switch (id) {
      case 'game-soundtrack':
        this.playGameSoundtrack();
        break;
      case 'room-ambience':
        this.playRoomAmbience();
        break;
      case 'blackout-cue':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 145,
          endFrequency: 72,
          durationSeconds: 0.2,
          maximumVolume: 0.04,
        });
        break;
      case 'lights-return':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 78,
          endFrequency: 235,
          durationSeconds: 0.14,
          maximumVolume: 0.018,
        });
        break;
      case 'report-correct':
        this.playToneCue({
          id,
          category: 'interface',
          type: 'sine',
          startFrequency: 430,
          endFrequency: 680,
          durationSeconds: 0.16,
          maximumVolume: 0.04,
        });
        break;
      case 'report-incorrect':
        this.playToneCue({
          id,
          category: 'interface',
          type: 'square',
          startFrequency: 145,
          endFrequency: 92,
          durationSeconds: 0.11,
          maximumVolume: 0.025,
        });
        break;
      case 'house-calm':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sine',
          startFrequency: 235,
          endFrequency: 390,
          durationSeconds: 0.24,
          maximumVolume: 0.018,
        });
        break;
      case 'house-pressure-1':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 82,
          endFrequency: 54,
          durationSeconds: 0.42,
          maximumVolume: 0.025,
        });
        break;
      case 'house-pressure-2':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 104,
          endFrequency: 38,
          durationSeconds: 0.68,
          maximumVolume: 0.018,
        });
        break;
      case 'house-takeover':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 69,
          endFrequency: 24,
          durationSeconds: 1.45,
          maximumVolume: 0.026,
        });
        break;
      case 'ambient-knock':
        this.playAmbientBufferCue(
          id,
          this.createKnockBuffer(this.context),
          'lowpass',
          720,
          1.8,
          0.2,
          0.74,
        );
        break;
      case 'ambient-footsteps':
        this.playAmbientBufferCue(
          id,
          this.createFootstepBuffer(this.context),
          'lowpass',
          930,
          0.9,
          0.15,
          3.15,
        );
        break;
      case 'ambient-whisper':
        this.playAmbientBufferCue(
          id,
          this.createWhisperBuffer(this.context),
          'bandpass',
          1_650,
          0.7,
          0.052,
          2.85,
        );
        break;
      case 'story-radio-burst':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 1_240,
          endFrequency: 178,
          durationSeconds: 0.62,
          maximumVolume: 0.012,
        });
        break;
      case 'story-photo-memory':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sine',
          startFrequency: 510,
          endFrequency: 335,
          durationSeconds: 0.38,
          maximumVolume: 0.022,
        });
        break;
      case 'story-radio-message':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 225,
          endFrequency: 112,
          durationSeconds: 1.35,
          maximumVolume: 0.025,
        });
        break;
      case 'story-radio-search':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 1_850,
          endFrequency: 43,
          durationSeconds: 2.75,
          maximumVolume: 0.014,
        });
        break;
      case 'story-bathroom-pipes':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 118,
          endFrequency: 47,
          durationSeconds: 1.6,
          maximumVolume: 0.018,
        });
        break;
      case 'story-bathroom-warning':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sine',
          startFrequency: 390,
          endFrequency: 96,
          durationSeconds: 1.25,
          maximumVolume: 0.02,
        });
        break;
      case 'story-bathroom-failure':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 156,
          endFrequency: 31,
          durationSeconds: 2.9,
          maximumVolume: 0.014,
        });
        break;
      case 'story-corridor-ring':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'square',
          startFrequency: 510,
          endFrequency: 430,
          durationSeconds: 2.8,
          maximumVolume: 0.018,
        });
        break;
      case 'story-corridor-prediction':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 172,
          endFrequency: 61,
          durationSeconds: 2.2,
          maximumVolume: 0.02,
        });
        break;
      case 'story-corridor-failure':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'square',
          startFrequency: 620,
          endFrequency: 74,
          durationSeconds: 3.05,
          maximumVolume: 0.022,
        });
        break;
      case 'story-office-radio-pattern':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 304,
          endFrequency: 608,
          durationSeconds: 2.4,
          maximumVolume: 0.018,
        });
        break;
      case 'story-office-radio-silence':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'square',
          startFrequency: 1_216,
          endFrequency: 38,
          durationSeconds: 0.09,
          maximumVolume: 0.022,
        });
        break;
      case 'story-office-erased-name':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sine',
          startFrequency: 304,
          endFrequency: 76,
          durationSeconds: 2.4,
          maximumVolume: 0.024,
        });
        break;
      case 'story-office-failure':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 304,
          endFrequency: 30.4,
          durationSeconds: 3.04,
          maximumVolume: 0.018,
        });
        break;
      case 'story-kitchen-reverse-breakfast':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'square',
          startFrequency: 980,
          endFrequency: 620,
          durationSeconds: 0.54,
          maximumVolume: 0.016,
        });
        break;
      case 'story-kitchen-chair-scrape':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 132,
          endFrequency: 43,
          durationSeconds: 0.82,
          maximumVolume: 0.014,
        });
        break;
      case 'story-kitchen-failure':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 912,
          endFrequency: 30.4,
          durationSeconds: 3.04,
          maximumVolume: 0.018,
        });
        break;
      case 'story-dining-voices':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 228,
          endFrequency: 114,
          durationSeconds: 2.4,
          maximumVolume: 0.016,
        });
        break;
      case 'story-dining-memory-pulse':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sine',
          startFrequency: 304,
          endFrequency: 152,
          durationSeconds: 0.72,
          maximumVolume: 0.022,
        });
        break;
      case 'story-dining-archive':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'square',
          startFrequency: 608,
          endFrequency: 76,
          durationSeconds: 1.8,
          maximumVolume: 0.014,
        });
        break;
      case 'story-dining-failure':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 1_216,
          endFrequency: 30.4,
          durationSeconds: 3.04,
          maximumVolume: 0.018,
        });
        break;
      case 'story-living-tape-wind':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 92,
          endFrequency: 146,
          durationSeconds: 1.6,
          maximumVolume: 0.012,
        });
        break;
      case 'story-living-tape-click':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'square',
          startFrequency: 420,
          endFrequency: 84,
          durationSeconds: 0.18,
          maximumVolume: 0.018,
        });
        break;
      case 'story-living-noah-voice':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 196,
          endFrequency: 98,
          durationSeconds: 3.04,
          maximumVolume: 0.016,
        });
        break;
      case 'story-living-memory-burst':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sine',
          startFrequency: 304,
          endFrequency: 76,
          durationSeconds: 1.45,
          maximumVolume: 0.022,
        });
        break;
      case 'story-living-failure':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 760,
          endFrequency: 30.4,
          durationSeconds: 3.04,
          maximumVolume: 0.018,
        });
        break;
      case 'door-unlock':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'triangle',
          startFrequency: 260,
          endFrequency: 540,
          durationSeconds: 0.22,
          maximumVolume: 0.036,
        });
        break;
      case 'door-open':
        this.playToneCue({
          id,
          category: 'effects',
          type: 'sawtooth',
          startFrequency: 155,
          endFrequency: 58,
          durationSeconds: 0.46,
          maximumVolume: 0.012,
          delaySeconds: 0.08,
        });
        break;
    }
  }

  public stop(id: AudioCueId): void {
    const cue = this.activeCues.get(id);

    if (cue === undefined) {
      return;
    }

    this.activeCues.delete(id);

    for (const source of cue.sources) {
      source.onended = null;

      try {
        source.stop();
      } catch {
        // The source may already have reached its scheduled stop time.
      }
    }

    this.disconnectCue(cue);
  }

  public setCategoryVolume(category: AudioCategory, volume: number): void {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new RangeError('Audio category volume must be between 0 and 1.');
    }

    this.volumes[category] = volume;
    this.applyMixerVolumes();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMixerVolumes();
  }

  public async suspend(): Promise<void> {
    if (this.context?.state === 'running') {
      await this.context.suspend();
    }
  }

  public getSnapshot(): AudioManagerSnapshot {
    return {
      contextState: this.context?.state ?? 'uninitialized',
      muted: this.muted,
      activeCueIds: AUDIO_CUE_IDS.filter((id) => this.activeCues.has(id)),
      volumes: { ...this.volumes },
    };
  }

  public async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    for (const id of AUDIO_CUE_IDS) {
      this.stop(id);
    }

    for (const gain of this.categoryGains.values()) {
      gain.disconnect();
    }

    this.categoryGains.clear();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.horrorScoreBuffer = null;

    if (this.context !== null && this.context.state !== 'closed') {
      await this.context.close();
    }

    this.context = null;
  }

  private createMixer(context: AudioContext): void {
    this.masterGain = context.createGain();
    this.masterGain.connect(context.destination);

    for (const category of ROUTED_AUDIO_CATEGORIES) {
      const gain = context.createGain();
      gain.connect(this.masterGain);
      this.categoryGains.set(category, gain);
    }

    this.applyMixerVolumes();
  }

  private applyMixerVolumes(): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    this.setAudioParam(
      this.masterGain?.gain,
      this.muted ? 0 : this.volumes.master,
      context.currentTime,
    );

    for (const category of ROUTED_AUDIO_CATEGORIES) {
      this.setAudioParam(
        this.categoryGains.get(category)?.gain,
        this.volumes[category],
        context.currentTime,
      );
    }
  }

  private playRoomAmbience(): void {
    const context = this.context;

    if (context === null || this.activeCues.has('room-ambience')) {
      return;
    }

    const ambienceDestination = this.requireCategoryGain('ambience');
    const roomTone = context.createBufferSource();
    const roomToneFilter = context.createBiquadFilter();
    const roomToneGain = context.createGain();
    const electricalHum = context.createOscillator();
    const electricalHumGain = context.createGain();
    const upperHum = context.createOscillator();
    const upperHumGain = context.createGain();
    const now = context.currentTime;

    roomTone.buffer = this.createRoomToneBuffer(context);
    roomTone.loop = true;
    roomToneFilter.type = 'lowpass';
    roomToneFilter.frequency.setValueAtTime(900, now);
    roomToneFilter.Q.setValueAtTime(0.7, now);
    roomToneGain.gain.setValueAtTime(0.024, now);
    electricalHum.type = 'sine';
    electricalHum.frequency.setValueAtTime(80, now);
    electricalHumGain.gain.setValueAtTime(0.012, now);
    upperHum.type = 'sine';
    upperHum.frequency.setValueAtTime(160, now);
    upperHumGain.gain.setValueAtTime(0.0035, now);
    roomTone.connect(roomToneFilter);
    roomToneFilter.connect(roomToneGain);
    roomToneGain.connect(ambienceDestination);
    electricalHum.connect(electricalHumGain);
    electricalHumGain.connect(ambienceDestination);
    upperHum.connect(upperHumGain);
    upperHumGain.connect(ambienceDestination);

    this.activateCue(
      'room-ambience',
      [roomTone, electricalHum, upperHum],
      [
        roomTone,
        roomToneFilter,
        roomToneGain,
        electricalHum,
        electricalHumGain,
        upperHum,
        upperHumGain,
      ],
    );
    roomTone.start(now);
    electricalHum.start(now);
    upperHum.start(now);
  }

  private playGameSoundtrack(): void {
    const context = this.context;

    if (context === null || this.activeCues.has('game-soundtrack')) {
      return;
    }

    const horrorScore = context.createBufferSource();
    const horrorScoreFilter = context.createBiquadFilter();
    const horrorScoreGain = context.createGain();
    const now = context.currentTime;

    horrorScore.buffer = this.getHorrorScoreBuffer(context);
    horrorScore.loop = true;
    horrorScoreFilter.type = 'lowpass';
    horrorScoreFilter.frequency.setValueAtTime(3_400, now);
    horrorScoreFilter.Q.setValueAtTime(0.45, now);
    horrorScoreGain.gain.setValueAtTime(0.16, now);
    horrorScore.connect(horrorScoreFilter);
    horrorScoreFilter.connect(horrorScoreGain);
    horrorScoreGain.connect(this.requireCategoryGain('music'));

    this.activateCue(
      'game-soundtrack',
      [horrorScore],
      [horrorScore, horrorScoreFilter, horrorScoreGain],
    );
    horrorScore.start(now);
  }

  private createRoomToneBuffer(context: AudioContext): AudioBuffer {
    const frameCount = Math.max(
      1,
      Math.floor(context.sampleRate * ROOM_TONE_SECONDS),
    );
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let state = 0x6d2b79f5;

    for (let index = 0; index < samples.length; index += 1) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      samples[index] = (state / UINT32_RANGE) * 2 - 1;
    }

    return buffer;
  }

  private getHorrorScoreBuffer(context: AudioContext): AudioBuffer {
    this.horrorScoreBuffer ??= createProceduralHorrorScore(context);
    return this.horrorScoreBuffer;
  }

  private playAmbientBufferCue(
    id: 'ambient-knock' | 'ambient-footsteps' | 'ambient-whisper',
    buffer: AudioBuffer,
    filterType: BiquadFilterType,
    filterFrequency: number,
    filterQ: number,
    maximumVolume: number,
    durationSeconds: number,
  ): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    this.stop(id);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, now);
    filter.Q.setValueAtTime(filterQ, now);
    gain.gain.setValueAtTime(maximumVolume, now);
    gain.gain.setValueAtTime(maximumVolume, now + durationSeconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.requireCategoryGain('ambience'));

    this.activateCue(id, [source], [source, filter, gain]);
    source.start(now);
    source.stop(now + durationSeconds + 0.01);
  }

  private createKnockBuffer(context: AudioContext): AudioBuffer {
    const durationSeconds = 0.74;
    const buffer = this.createStereoBuffer(context, durationSeconds);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const knockTimes = [0.04, 0.22, 0.47] as const;
    const random = this.createAmbientRandom(0x4b4e4f43);
    const pan = random() * 1.4 - 0.7;
    const [leftPan, rightPan] = equalPowerPan(pan);

    for (let index = 0; index < left.length; index += 1) {
      const time = index / context.sampleRate;
      let sample = 0;

      for (const knockTime of knockTimes) {
        const elapsed = time - knockTime;

        if (elapsed < 0 || elapsed > 0.12) {
          continue;
        }

        const envelope = Math.exp(-elapsed * 38);
        const body = Math.sin(elapsed * Math.PI * 2 * 92);
        sample += (body * 0.82 + (random() * 2 - 1) * 0.28) * envelope;
      }

      left[index] = sample * leftPan;
      right[index] = sample * rightPan;
    }

    return buffer;
  }

  private createFootstepBuffer(context: AudioContext): AudioBuffer {
    const durationSeconds = 3.15;
    const buffer = this.createStereoBuffer(context, durationSeconds);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const stepTimes = [0.12, 0.62, 1.13, 1.66, 2.22, 2.78] as const;
    const random = this.createAmbientRandom(0x53544550);
    const startsOnLeft = random() < 0.5;

    for (let index = 0; index < left.length; index += 1) {
      const time = index / context.sampleRate;

      for (let stepIndex = 0; stepIndex < stepTimes.length; stepIndex += 1) {
        const stepTime = stepTimes[stepIndex] as number;
        const elapsed = time - stepTime;

        if (elapsed < 0 || elapsed > 0.18) {
          continue;
        }

        const travel = stepIndex / (stepTimes.length - 1);
        const pan = (startsOnLeft ? -0.82 : 0.82) * (1 - travel * 2);
        const [leftPan, rightPan] = equalPowerPan(pan);
        const envelope = Math.exp(-elapsed * 24);
        const heel = Math.sin(elapsed * Math.PI * 2 * (66 + stepIndex * 3));
        const texture = random() * 2 - 1;
        const sample = (heel * 0.68 + texture * 0.38) * envelope;
        left[index] = (left[index] ?? 0) + sample * leftPan;
        right[index] = (right[index] ?? 0) + sample * rightPan;
      }
    }

    return buffer;
  }

  private createWhisperBuffer(context: AudioContext): AudioBuffer {
    const durationSeconds = 2.85;
    const buffer = this.createStereoBuffer(context, durationSeconds);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const random = this.createAmbientRandom(0x57535052);
    const direction = random() < 0.5 ? -1 : 1;

    for (let index = 0; index < left.length; index += 1) {
      const time = index / context.sampleRate;
      const progress = time / durationSeconds;
      const fade = Math.sin(Math.PI * progress) ** 1.4;
      const syllables =
        0.22 +
        Math.max(0, Math.sin(time * Math.PI * 4.8)) * 0.58 +
        Math.max(0, Math.sin(time * Math.PI * 7.1 + 1.4)) * 0.2;
      const breath = (random() * 2 - 1) * fade * syllables;
      const pan = direction * (0.2 + progress * 0.62);
      const [leftPan, rightPan] = equalPowerPan(pan);
      left[index] = breath * leftPan;
      right[index] = breath * rightPan;
    }

    return buffer;
  }

  private createStereoBuffer(
    context: AudioContext,
    durationSeconds: number,
  ): AudioBuffer {
    const frameCount = Math.max(
      1,
      Math.floor(context.sampleRate * durationSeconds),
    );
    return context.createBuffer(2, frameCount, context.sampleRate);
  }

  private createAmbientRandom(seed: number): () => number {
    this.ambientCueSequence += 1;
    let state = (seed ^ Math.imul(this.ambientCueSequence, 0x9e3779b1)) >>> 0;

    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / UINT32_RANGE;
    };
  }

  private playToneCue(options: {
    readonly id: Exclude<AudioCueId, 'game-soundtrack' | 'room-ambience'>;
    readonly category: RoutedAudioCategory;
    readonly type: OscillatorType;
    readonly startFrequency: number;
    readonly endFrequency: number;
    readonly durationSeconds: number;
    readonly maximumVolume: number;
    readonly delaySeconds?: number;
  }): void {
    const context = this.context;

    if (context === null) {
      return;
    }

    this.stop(options.id);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + (options.delaySeconds ?? 0);
    const endAt = startAt + options.durationSeconds;

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.startFrequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(
      options.endFrequency,
      endAt,
    );
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(
      options.maximumVolume,
      startAt + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gain);
    gain.connect(this.requireCategoryGain(options.category));

    this.activateCue(options.id, [oscillator], [oscillator, gain]);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.01);
  }

  private activateCue(
    id: AudioCueId,
    sources: readonly AudioScheduledSourceNode[],
    nodes: readonly AudioNode[],
  ): void {
    const cue: ActiveCue = {
      sources: new Set(sources),
      nodes: new Set(nodes),
    };

    this.activeCues.set(id, cue);

    for (const source of sources) {
      source.onended = () => {
        if (this.activeCues.get(id) !== cue) {
          return;
        }

        cue.sources.delete(source);

        if (cue.sources.size === 0) {
          this.activeCues.delete(id);
          this.disconnectCue(cue);
        }
      };
    }
  }

  private disconnectCue(cue: ActiveCue): void {
    for (const node of cue.nodes) {
      node.disconnect();
    }

    cue.sources.clear();
    cue.nodes.clear();
  }

  private requireCategoryGain(category: RoutedAudioCategory): GainNode {
    const gain = this.categoryGains.get(category);

    if (gain === undefined) {
      throw new Error(`Audio mixer category "${category}" is unavailable.`);
    }

    return gain;
  }

  private setAudioParam(
    parameter: AudioParam | undefined,
    value: number,
    now: number,
  ): void {
    if (parameter === undefined) {
      return;
    }

    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(value, now);
  }
}

function equalPowerPan(pan: number): readonly [number, number] {
  const safePan = Math.min(1, Math.max(-1, pan));
  const angle = ((safePan + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}

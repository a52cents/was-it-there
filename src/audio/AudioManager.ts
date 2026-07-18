export type AudioCategory =
  | 'master'
  | 'music'
  | 'ambience'
  | 'effects'
  | 'interface';

export const AUDIO_CUE_IDS = [
  'room-ambience',
  'blackout-cue',
  'lights-return',
  'report-correct',
  'report-incorrect',
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
const VIOLIN_LOOP_SECONDS = 18;
const VIOLIN_NOTE_DURATION_SECONDS = 9;
const VIOLIN_NOTE_FREQUENCIES = [220, 146.83] as const;
const UINT32_RANGE = 4_294_967_296;

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly categoryGains = new Map<RoutedAudioCategory, GainNode>();
  private readonly volumes: Record<AudioCategory, number> = {
    ...DEFAULT_VOLUMES,
  };
  private readonly activeCues = new Map<AudioCueId, ActiveCue>();
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

    const destination = this.requireCategoryGain('ambience');
    const roomTone = context.createBufferSource();
    const roomToneFilter = context.createBiquadFilter();
    const roomToneGain = context.createGain();
    const electricalHum = context.createOscillator();
    const electricalHumGain = context.createGain();
    const upperHum = context.createOscillator();
    const upperHumGain = context.createGain();
    const violinNotes = context.createBufferSource();
    const violinGain = context.createGain();
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
    violinNotes.buffer = this.createViolinAmbienceBuffer(context);
    violinNotes.loop = true;
    violinGain.gain.setValueAtTime(0.055, now);

    roomTone.connect(roomToneFilter);
    roomToneFilter.connect(roomToneGain);
    roomToneGain.connect(destination);
    electricalHum.connect(electricalHumGain);
    electricalHumGain.connect(destination);
    upperHum.connect(upperHumGain);
    upperHumGain.connect(destination);
    violinNotes.connect(violinGain);
    violinGain.connect(destination);

    this.activateCue(
      'room-ambience',
      [roomTone, electricalHum, upperHum, violinNotes],
      [
        roomTone,
        roomToneFilter,
        roomToneGain,
        electricalHum,
        electricalHumGain,
        upperHum,
        upperHumGain,
        violinNotes,
        violinGain,
      ],
    );
    roomTone.start(now);
    electricalHum.start(now);
    upperHum.start(now);
    violinNotes.start(now);
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

  private createViolinAmbienceBuffer(context: AudioContext): AudioBuffer {
    const frameCount = Math.max(
      1,
      Math.floor(context.sampleRate * VIOLIN_LOOP_SECONDS),
    );
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const samples = buffer.getChannelData(0);

    for (const [noteIndex, frequency] of VIOLIN_NOTE_FREQUENCIES.entries()) {
      const noteStartsAt = noteIndex * (VIOLIN_LOOP_SECONDS / 2);

      for (let frame = 0; frame < samples.length; frame += 1) {
        const elapsed = frame / context.sampleRate - noteStartsAt;

        if (elapsed < 0 || elapsed >= VIOLIN_NOTE_DURATION_SECONDS) {
          continue;
        }

        const attack = Math.min(1, elapsed / 0.75);
        const finalFade = Math.min(
          1,
          (VIOLIN_NOTE_DURATION_SECONDS - elapsed) / 1.4,
        );
        const decay = Math.exp(-elapsed * 0.035);
        const envelope = attack * finalFade * decay;
        const vibrato = Math.sin(Math.PI * 2 * 5.1 * elapsed) * 0.24;
        const phase = Math.PI * 2 * frequency * elapsed + vibrato;
        const tone =
          Math.sin(phase) * 0.46 +
          Math.sin(phase * 2.001) * 0.25 +
          Math.sin(phase * 3.004) * 0.15 +
          Math.sin(phase * 4.008) * 0.09 +
          Math.sin(phase * 5.013) * 0.05;

        samples[frame] = (samples[frame] ?? 0) + tone * envelope;
      }
    }

    return buffer;
  }

  private playToneCue(options: {
    readonly id: Exclude<AudioCueId, 'room-ambience'>;
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

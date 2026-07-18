import type * as THREE from 'three';
import type { DebugSnapshot, DebugVector3 } from '../debug/DebugSnapshot';
import {
  formatElapsedMilliseconds,
  formatRemainingMilliseconds,
} from '../core/time/TimeFormatting';
import {
  ObservationTargetDebugLabels,
  type DebugObservationTarget,
} from './ObservationTargetDebugLabels';

export interface InputDebugPanelOptions {
  readonly getSnapshot: () => DebugSnapshot;
  readonly getObservationTargets: () => readonly DebugObservationTarget[];
  readonly onReset: () => void;
  readonly onRemountRoom: () => void;
  readonly onApplyAnomalySeed: (seed: number) => void;
  readonly onRestoreAnomalies: () => void;
  readonly onOpenLevelBuilder: () => void;
  readonly isCollisionGeometryVisible: () => boolean;
  readonly setCollisionGeometryVisible: (visible: boolean) => void;
  readonly isCapsuleVisible: () => boolean;
  readonly setCapsuleVisible: (visible: boolean) => void;
  readonly areInteractionVolumesVisible: () => boolean;
  readonly setInteractionVolumesVisible: (visible: boolean) => void;
  readonly setEffectsVolume: (volume: number) => void;
  readonly setMusicVolume: (volume: number) => void;
}

export class InputDebugPanel {
  private readonly element: HTMLElement;
  private readonly output: HTMLPreElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly remountButton: HTMLButtonElement;
  private readonly applyAnomalyButton: HTMLButtonElement;
  private readonly restoreAnomaliesButton: HTMLButtonElement;
  private readonly openLevelBuilderButton: HTMLButtonElement;
  private readonly anomalySeedInput: HTMLInputElement;
  private readonly collisionCheckbox: HTMLInputElement;
  private readonly capsuleCheckbox: HTMLInputElement;
  private readonly interactionVolumesCheckbox: HTMLInputElement;
  private readonly targetLabelsCheckbox: HTMLInputElement;
  private readonly effectsVolumeInput: HTMLInputElement;
  private readonly effectsVolumeOutput: HTMLOutputElement;
  private readonly musicVolumeInput: HTMLInputElement;
  private readonly musicVolumeOutput: HTMLOutputElement;
  private readonly targetLabels: ObservationTargetDebugLabels;
  private visible = true;

  public constructor(
    root: HTMLElement,
    private readonly camera: THREE.Camera,
    private readonly options: InputDebugPanelOptions,
  ) {
    this.targetLabels = new ObservationTargetDebugLabels(root);
    this.element = root.ownerDocument.createElement('aside');
    this.element.className = 'input-debug-panel';
    this.element.setAttribute('aria-hidden', 'true');

    const header = root.ownerDocument.createElement('header');
    header.className = 'input-debug-panel__header';
    const title = root.ownerDocument.createElement('span');
    title.textContent = 'DEVELOPMENT OVERLAY';
    const shortcut = root.ownerDocument.createElement('kbd');
    shortcut.textContent = 'H  TOGGLE';
    header.append(title, shortcut);

    this.output = root.ownerDocument.createElement('pre');
    this.output.className = 'input-debug-panel__output';

    const initialAudio = options.getSnapshot().audio;
    const effectsVolume = this.createVolumeSlider(
      root.ownerDocument,
      'SFX VOLUME',
      initialAudio.volumes.effects,
      this.handleEffectsVolumeInput,
    );
    this.effectsVolumeInput = effectsVolume.input;
    this.effectsVolumeOutput = effectsVolume.output;
    const musicVolume = this.createVolumeSlider(
      root.ownerDocument,
      'MUSIC / AMBIENCE',
      initialAudio.volumes.ambience,
      this.handleMusicVolumeInput,
    );
    this.musicVolumeInput = musicVolume.input;
    this.musicVolumeOutput = musicVolume.output;

    this.collisionCheckbox = this.createCheckbox(
      root.ownerDocument,
      'Show collisions',
      options.isCollisionGeometryVisible(),
      this.handleCollisionVisibilityChange,
    );
    this.capsuleCheckbox = this.createCheckbox(
      root.ownerDocument,
      'Show capsule',
      options.isCapsuleVisible(),
      this.handleCapsuleVisibilityChange,
    );
    this.targetLabelsCheckbox = this.createCheckbox(
      root.ownerDocument,
      'Show target names',
      false,
      this.handleTargetLabelsVisibilityChange,
    );
    this.interactionVolumesCheckbox = this.createCheckbox(
      root.ownerDocument,
      'Show interaction volumes',
      options.areInteractionVolumesVisible(),
      this.handleInteractionVolumesVisibilityChange,
    );
    this.resetButton = this.createButton(
      root.ownerDocument,
      'RESET PLAYER',
      this.handleReset,
    );
    this.remountButton = this.createButton(
      root.ownerDocument,
      'REMOUNT ROOM',
      this.handleRemountRoom,
    );
    this.anomalySeedInput = this.createSeedInput(root.ownerDocument);
    this.applyAnomalyButton = this.createButton(
      root.ownerDocument,
      'APPLY ANOMALY',
      this.handleApplyAnomaly,
    );
    this.restoreAnomaliesButton = this.createButton(
      root.ownerDocument,
      'RESTORE ROOM',
      this.handleRestoreAnomalies,
    );
    this.openLevelBuilderButton = this.createButton(
      root.ownerDocument,
      'OPEN LEVEL BUILDER',
      this.handleOpenLevelBuilder,
    );

    this.element.append(
      header,
      this.output,
      this.effectsVolumeInput.parentElement as HTMLElement,
      this.musicVolumeInput.parentElement as HTMLElement,
      this.anomalySeedInput.parentElement as HTMLElement,
      this.applyAnomalyButton,
      this.restoreAnomaliesButton,
      this.openLevelBuilderButton,
      root.ownerDocument.createElement('br'),
      this.collisionCheckbox.parentElement as HTMLElement,
      this.capsuleCheckbox.parentElement as HTMLElement,
      this.interactionVolumesCheckbox.parentElement as HTMLElement,
      this.targetLabelsCheckbox.parentElement as HTMLElement,
      this.resetButton,
      this.remountButton,
    );
    root.append(this.element);
    this.update();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.element.hidden = !visible;
    this.targetLabels.setVisible(
      visible && this.targetLabelsCheckbox.checked,
    );
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public update(): void {
    if (!this.visible) {
      return;
    }

    const snapshot = this.options.getSnapshot();
    this.updateVolumeControl(
      this.effectsVolumeInput,
      this.effectsVolumeOutput,
      snapshot.audio.volumes.effects,
    );
    this.updateVolumeControl(
      this.musicVolumeInput,
      this.musicVolumeOutput,
      snapshot.audio.volumes.ambience,
    );

    this.output.textContent = [
      'PHASE 3 DEBUG',
      `Game state: ${snapshot.app.gameState}`,
      `Run time: ${formatElapsedMilliseconds(snapshot.timing.activeTimeMs)} | Penalties: +${formatElapsedMilliseconds(snapshot.timing.penaltyTimeMs)} | Final: ${formatElapsedMilliseconds(snapshot.timing.finalTimeMs)}`,
      this.formatPhaseTiming(snapshot),
      `Current room: ${snapshot.room.id}`,
      `Game active: ${this.formatBoolean(snapshot.app.gameActive)} | Pointer locked: ${this.formatBoolean(snapshot.app.pointerLocked)}`,
      `Audio: ${snapshot.audio.contextState} | Muted: ${this.formatBoolean(snapshot.audio.muted)} | Active: ${snapshot.audio.activeCueIds.join(', ') || 'none'}`,
      `FPS: ${this.formatNumber(snapshot.rendering.fps, 1)} | Frame delta: ${this.formatNumber(snapshot.rendering.frameDeltaSeconds * 1_000, 2)} ms`,
      `Fixed steps: ${snapshot.physics.fixedSteps}`,
      `Draw calls: ${snapshot.rendering.drawCalls} | Triangles: ${snapshot.rendering.triangles}`,
      `Player position: ${this.formatVector(snapshot.player.position)}`,
      `Yaw: ${this.formatNumber(snapshot.player.yaw)} | Pitch: ${this.formatNumber(snapshot.player.pitch)}`,
      `Horizontal speed: ${this.formatNumber(snapshot.player.horizontalSpeed)} m/s`,
      `Vertical velocity: ${this.formatNumber(snapshot.player.verticalVelocity)} m/s`,
      `Grounded: ${this.formatBoolean(snapshot.player.grounded)}`,
      `Capsule radius: ${this.formatNumber(snapshot.capsule.radius)}`,
      `Capsule start: ${this.formatVector(snapshot.capsule.start)}`,
      `Capsule end: ${this.formatVector(snapshot.capsule.end)}`,
      `World collider ready: ${this.formatBoolean(snapshot.physics.worldColliderReady)}`,
      `Visual object count: ${snapshot.room.visualObjectCount}`,
      `Collision object count: ${snapshot.room.collisionObjectCount}`,
      `Observation target count: ${snapshot.room.observationTargetCount}`,
      `Aimed target: ${snapshot.interaction.aimedTargetId ?? 'none'}`,
      `Last clicked target: ${snapshot.interaction.lastSelectedTargetId ?? 'none'}`,
      `Reports: ${snapshot.reporting.foundTargetIds.length} found | ${snapshot.reporting.remainingCount} left | ${snapshot.reporting.incorrectCount} incorrect`,
      `Last report: ${snapshot.reporting.lastResult?.outcome ?? 'none'}`,
      `Errors: ${snapshot.errors.errorCount} / ${snapshot.errors.maximumErrors} | Last: ${snapshot.errors.lastError ?? 'none'} | Game over: ${this.formatBoolean(snapshot.errors.gameOver)}`,
      `Exit door: ${snapshot.progression.exitDoor.state} | ${this.formatNumber(snapshot.progression.exitDoor.progress * 100, 1)}% | Collision: ${this.formatBoolean(snapshot.progression.exitDoor.collisionEnabled)}`,
      `Run seed: ${snapshot.anomaly.runIdentity?.seed ?? 'not started'}`,
      `Initially absent: ${snapshot.anomaly.baseline?.hiddenTargetIds.join(', ') || 'none'}`,
      `Initial color changes: ${snapshot.anomaly.baseline?.colorChanges.map(({ targetId, variantId }) => `${targetId}/${variantId}`).join(', ') || 'none'}`,
      `Blackout: ${snapshot.anomaly.blackout.stage} | ${snapshot.anomaly.blackout.elapsedMs} ms | Applied: ${this.formatBoolean(snapshot.anomaly.appliedDuringBlackout)}`,
      this.formatPendingAnomalyPlan(snapshot),
      this.formatAnomalyPlan(snapshot),
      ...(snapshot.anomaly.error === null
        ? []
        : [`Anomaly error: ${snapshot.anomaly.error}`]),
      `Exit door found: ${this.formatBoolean(snapshot.room.exitDoorFound)}`,
    ].join('\n');

    this.targetLabels.update(
      this.options.getObservationTargets(),
      this.camera,
    );
  }

  public dispose(): void {
    this.resetButton.removeEventListener('click', this.handleReset);
    this.remountButton.removeEventListener('click', this.handleRemountRoom);
    this.applyAnomalyButton.removeEventListener(
      'click',
      this.handleApplyAnomaly,
    );
    this.restoreAnomaliesButton.removeEventListener(
      'click',
      this.handleRestoreAnomalies,
    );
    this.openLevelBuilderButton.removeEventListener(
      'click',
      this.handleOpenLevelBuilder,
    );
    this.collisionCheckbox.removeEventListener(
      'change',
      this.handleCollisionVisibilityChange,
    );
    this.capsuleCheckbox.removeEventListener(
      'change',
      this.handleCapsuleVisibilityChange,
    );
    this.interactionVolumesCheckbox.removeEventListener(
      'change',
      this.handleInteractionVolumesVisibilityChange,
    );
    this.targetLabelsCheckbox.removeEventListener(
      'change',
      this.handleTargetLabelsVisibilityChange,
    );
    this.effectsVolumeInput.removeEventListener(
      'input',
      this.handleEffectsVolumeInput,
    );
    this.musicVolumeInput.removeEventListener(
      'input',
      this.handleMusicVolumeInput,
    );
    this.targetLabels.dispose();
    this.element.remove();
  }

  private createCheckbox(
    document: Document,
    text: string,
    checked: boolean,
    listener: EventListener,
  ): HTMLInputElement {
    const label = document.createElement('label');
    label.className = 'input-debug-panel__toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', listener);
    label.append(input, ` ${text}`);
    return input;
  }

  private createButton(
    document: Document,
    text: string,
    listener: EventListener,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.className = 'input-debug-panel__button';
    button.addEventListener('click', listener);
    return button;
  }

  private createVolumeSlider(
    document: Document,
    text: string,
    value: number,
    listener: EventListener,
  ): {
    readonly input: HTMLInputElement;
    readonly output: HTMLOutputElement;
  } {
    const label = document.createElement('label');
    label.className = 'input-debug-panel__slider';
    const title = document.createElement('span');
    title.textContent = text;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.01';
    input.value = String(value);
    input.setAttribute('aria-label', text);
    input.className = 'input-debug-panel__range';
    const output = document.createElement('output');
    output.className = 'input-debug-panel__value';
    input.addEventListener('input', listener);
    label.append(title, input, output);
    this.updateVolumeControl(input, output, value);
    return { input, output };
  }

  private createSeedInput(document: Document): HTMLInputElement {
    const label = document.createElement('label');
    label.textContent = 'Seed ';
    label.className = 'input-debug-panel__seed';
    const input = document.createElement('input');
    input.type = 'number';
    input.value = '12345';
    input.min = '0';
    input.max = '4294967295';
    input.step = '1';
    input.setAttribute('aria-label', 'Anomaly seed');
    input.className = 'input-debug-panel__seed-input';
    label.append(input);
    return input;
  }

  private readonly handleReset = (): void => {
    this.options.onReset();
    this.update();
  };

  private readonly handleRemountRoom = (): void => {
    this.options.onRemountRoom();
    this.update();
  };

  private readonly handleApplyAnomaly = (): void => {
    const seed = Number(this.anomalySeedInput.value);
    this.options.onApplyAnomalySeed(seed);
    this.update();
  };

  private readonly handleRestoreAnomalies = (): void => {
    this.options.onRestoreAnomalies();
    this.update();
  };

  private readonly handleOpenLevelBuilder = (): void => {
    this.options.onOpenLevelBuilder();
  };

  private readonly handleCollisionVisibilityChange = (): void => {
    this.options.setCollisionGeometryVisible(
      this.collisionCheckbox.checked,
    );
  };

  private readonly handleCapsuleVisibilityChange = (): void => {
    this.options.setCapsuleVisible(this.capsuleCheckbox.checked);
  };

  private readonly handleTargetLabelsVisibilityChange = (): void => {
    this.targetLabels.setVisible(
      this.visible && this.targetLabelsCheckbox.checked,
    );
  };

  private readonly handleInteractionVolumesVisibilityChange = (): void => {
    this.options.setInteractionVolumesVisible(
      this.interactionVolumesCheckbox.checked,
    );
  };

  private readonly handleEffectsVolumeInput = (): void => {
    const volume = Number(this.effectsVolumeInput.value);
    this.options.setEffectsVolume(volume);
    this.updateVolumeControl(
      this.effectsVolumeInput,
      this.effectsVolumeOutput,
      volume,
    );
  };

  private readonly handleMusicVolumeInput = (): void => {
    const volume = Number(this.musicVolumeInput.value);
    this.options.setMusicVolume(volume);
    this.updateVolumeControl(
      this.musicVolumeInput,
      this.musicVolumeOutput,
      volume,
    );
  };

  private updateVolumeControl(
    input: HTMLInputElement,
    output: HTMLOutputElement,
    value: number,
  ): void {
    const safeValue = Number.isFinite(value)
      ? Math.min(1, Math.max(0, value))
      : 0;
    input.value = String(safeValue);
    output.value = `${Math.round(safeValue * 100)}%`;
  }

  private formatBoolean(value: boolean): 'yes' | 'no' {
    return value ? 'yes' : 'no';
  }

  private formatNumber(value: number, digits = 3): string {
    return Number.isFinite(value) ? value.toFixed(digits) : (0).toFixed(digits);
  }

  private formatVector(vector: DebugVector3): string {
    return [vector.x, vector.y, vector.z]
      .map((value) => this.formatNumber(value))
      .join(', ');
  }

  private formatPhaseTiming(snapshot: DebugSnapshot): string {
    const phase = snapshot.timing.phase;

    if (phase === null) {
      return 'Phase timer: inactive';
    }

    return [
      `Phase timer: ${phase.phase}`,
      `Remaining: ${formatRemainingMilliseconds(phase.remainingMs)}`,
      `Expired: ${this.formatBoolean(phase.expired)}`,
    ].join(' | ');
  }

  private formatAnomalyPlan(snapshot: DebugSnapshot): string {
    const plan = snapshot.anomaly.activePlan;

    if (plan === null) {
      return 'Active anomaly: none';
    }

    const anomalies = plan.anomalies
      .map(
        (anomaly) =>
          `${anomaly.targetId}/${anomaly.kind}/${anomaly.variantId}`,
      )
      .join(', ');

    return `Anomaly seeds: run ${plan.runSeed} | room ${plan.roomSeed}\nActive anomaly: ${anomalies || 'none'}`;
  }

  private formatPendingAnomalyPlan(snapshot: DebugSnapshot): string {
    const plan = snapshot.anomaly.pendingPlan;

    if (plan === null) {
      return 'Pending anomaly: none';
    }

    return `Pending anomaly: ${this.formatAnomalies(plan)}`;
  }

  private formatAnomalies(
    plan: NonNullable<DebugSnapshot['anomaly']['activePlan']>,
  ): string {
    return (
      plan.anomalies
        .map(
          (anomaly) =>
            `${anomaly.targetId}/${anomaly.kind}/${anomaly.variantId}`,
        )
        .join(', ') || 'none'
    );
  }
}

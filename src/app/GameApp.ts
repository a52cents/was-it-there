import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { RoomAudioDirector } from '../audio/RoomAudioDirector';
import { deriveRoomSeed } from '../core/random/SeededRandom';
import { GreyboxDebugRuntime } from '../debug/GreyboxDebugRuntime';
import { parseLevelBuilderDocument } from '../debug/level-builder/LevelBuilderDocument';
import {
  BlackoutTimeline,
  type BlackoutSnapshot,
} from '../gameplay/anomalies/BlackoutTimeline';
import type { AnomalyPlan } from '../gameplay/anomalies/AnomalyGenerator';
import { describeFirstAnomaly } from '../gameplay/anomalies/AnomalyPresentation';
import { RoomAnomalySystem } from '../gameplay/anomalies/RoomAnomalySystem';
import { AnomalyTargetSelector } from '../gameplay/interaction/AnomalyTargetSelector';
import { RoomReportSystem } from '../gameplay/interaction/RoomReportSystem';
import { TargetReportHighlight } from '../gameplay/interaction/TargetReportHighlight';
import { ExitDoorController } from '../gameplay/progression/ExitDoorController';
import { ExitThresholdDetector } from '../gameplay/progression/ExitThresholdDetector';
import {
  EscapeRouteProgression,
  selectAnomalyCount,
} from '../gameplay/progression/EscapeRoute';
import {
  createRunIdentity,
  type RunIdentity,
} from '../gameplay/run/RunIdentity';
import {
  RunErrorTracker,
  type RunErrorKind,
} from '../gameplay/run/RunErrorTracker';
import { DesktopInput } from '../input/DesktopInput';
import { InputManager } from '../input/InputManager';
import type { PlatformManager } from '../platform/PlatformManager';
import { PlayerController } from '../player/PlayerController';
import { CameraManager } from '../rendering/CameraManager';
import { RendererManager } from '../rendering/RendererManager';
import { PhaseTimerDisplay } from '../ui/PhaseTimerDisplay';
import { BlackoutView } from '../ui/BlackoutView';
import { GameOverScreen } from '../ui/GameOverScreen';
import { PauseScreen } from '../ui/PauseScreen';
import { ReportHud } from '../ui/ReportHud';
import { RoomCompleteBanner } from '../ui/RoomCompleteBanner';
import { StartScreen } from '../ui/StartScreen';
import { VictoryScreen } from '../ui/VictoryScreen';
import { AssetManager } from '../world/assets/AssetManager';
import { GreyboxBathroom } from '../world/rooms/GreyboxBathroom';
import { GreyboxBedroom } from '../world/rooms/GreyboxBedroom';
import { GreyboxCorridor } from '../world/rooms/GreyboxCorridor';
import type { PlayableRoom } from '../world/rooms/PlayableRoom';
import { RoomPreloader } from '../world/RoomPreloader';
import bathroomAnomalyCatalog from '../world/rooms/greybox-bathroom-anomalies.json';
import bedroomAnomalyCatalog from '../world/rooms/greybox-bedroom-anomalies.json';
import corridorAnomalyCatalog from '../world/rooms/first-corridor-anomalies.json';
import { WorldCollision } from '../world/WorldCollision';
import { GameLoop } from './GameLoop';
import {
  GameStateMachine,
  type GameStateTransition,
} from './GameStateMachine';
import { RunTimer } from './RunTimer';

export interface GameAppElements {
  readonly canvas: HTMLCanvasElement;
  readonly hudLayer: HTMLElement;
  readonly menuLayer: HTMLElement;
  readonly modalLayer: HTMLElement;
  readonly title: HTMLHeadingElement;
  readonly playButton: HTMLButtonElement;
  readonly pointerLockPrompt: HTMLButtonElement;
}

const POINTER_LOCK_COPY = {
  resume: 'RETURN TO THE ROOM',
  unavailable: 'RETRY MOUSE CAPTURE',
} as const;

export class GameApp {
  private readonly scene = new THREE.Scene();
  private readonly gameStateMachine = new GameStateMachine();
  private readonly runTimer = new RunTimer();
  private readonly blackoutTimeline = new BlackoutTimeline();
  private readonly audioManager = new AudioManager();
  private readonly roomAudioDirector = new RoomAudioDirector(
    this.audioManager,
  );
  private readonly cameraManager = new CameraManager();
  private readonly rendererManager: RendererManager;
  private readonly gameLoop: GameLoop;
  private readonly startScreen: StartScreen;
  private readonly pauseScreen: PauseScreen;
  private readonly phaseTimerDisplay: PhaseTimerDisplay;
  private readonly blackoutView: BlackoutView;
  private readonly reportHud: ReportHud;
  private readonly roomCompleteBanner: RoomCompleteBanner;
  private readonly gameOverScreen: GameOverScreen;
  private readonly victoryScreen: VictoryScreen;
  private readonly inputManager = new InputManager();
  private readonly desktopInput: DesktopInput;
  private readonly playerController: PlayerController;
  private debugRuntime: GreyboxDebugRuntime | null = null;
  private debugVisible = true;
  private readonly worldCollision = new WorldCollision();
  private readonly assetManager = new AssetManager();
  private readonly roomPreloader = new RoomPreloader<PlayableRoom>(
    this.assetManager,
    (roomIndex) => this.createRoom(roomIndex),
    (roomIndex, error) => {
      console.warn(`Room ${roomIndex + 1} could not be preloaded.`, error);
    },
  );
  private readonly roomProgression = new EscapeRouteProgression();
  private room: PlayableRoom;
  private targetSelector: AnomalyTargetSelector;
  private anomalySystem: RoomAnomalySystem;
  private readonly reportSystem = new RoomReportSystem();
  private readonly runErrorTracker = new RunErrorTracker();
  private readonly targetReportHighlight: TargetReportHighlight;
  private exitDoorController: ExitDoorController;
  private exitThresholdDetector: ExitThresholdDetector;
  private readonly unsubscribeGameState: () => void;

  private initialized = false;
  private destroyed = false;
  private experienceStarted = false;
  private gameplayActive = false;
  private aimedTargetId: string | null = null;
  private lastSelectedTargetId: string | null = null;
  private runIdentity: RunIdentity | null = null;
  private pendingAnomalyPlan: AnomalyPlan | null = null;
  private anomalyAppliedDuringBlackout = false;
  private nextRunSeedOverride: number | null = null;
  private gameOverRevealTarget: THREE.Object3D | null = null;
  private readonly gameOverRevealCenter = new THREE.Vector3();
  private roomTransitionPromise: Promise<void> | null = null;

  public constructor(
    private readonly elements: GameAppElements,
    private readonly platformManager: PlatformManager,
  ) {
    this.room = new GreyboxBedroom();
    if (this.room.definition.id !== this.roomProgression.currentStep.id) {
      throw new Error(
        `First escape room must be "${this.roomProgression.currentStep.id}", received "${this.room.definition.id}".`,
      );
    }

    this.scene.background = new THREE.Color(0x2d2927);
    this.room.mount({ scene: this.scene, worldCollision: this.worldCollision });
    this.targetSelector = new AnomalyTargetSelector(
      this.room.getAnomalyTargetRegistry(),
    );
    this.anomalySystem = new RoomAnomalySystem(
      this.room.getAnomalyTargetRegistry(),
      () => {
        this.worldCollision.buildFromObject(
          this.room.getCollisionRoot(),
        );
      },
    );
    this.targetReportHighlight = new TargetReportHighlight(this.scene);
    this.exitDoorController = new ExitDoorController({
      getDoor: () => this.room.getExitDoor(),
      setCollisionEnabled: (enabled) =>
        this.room.setExitDoorCollisionEnabled(enabled),
      setPortalProgress: (progress) =>
        this.room.setExitPortalProgress(progress),
    });
    this.exitThresholdDetector = new ExitThresholdDetector(
      this.room.getExitThresholdDefinition(),
    );

    this.rendererManager = new RendererManager(
      elements.canvas,
      (width, height) => this.cameraManager.updateAspect(width, height),
    );
    this.startScreen = new StartScreen(
      elements.menuLayer,
      elements.title,
      elements.playButton,
    );
    this.pauseScreen = new PauseScreen(
      elements.modalLayer,
      elements.pointerLockPrompt,
    );
    this.phaseTimerDisplay = new PhaseTimerDisplay(elements.hudLayer);
    this.blackoutView = new BlackoutView(elements.hudLayer);
    this.reportHud = new ReportHud(elements.hudLayer);
    this.roomCompleteBanner = new RoomCompleteBanner(elements.hudLayer);
    this.gameOverScreen = new GameOverScreen(elements.modalLayer);
    this.gameOverScreen.onTryAgain(() => this.tryAgain());
    this.victoryScreen = new VictoryScreen(elements.modalLayer);
    this.victoryScreen.onPlayAgain(() => this.playAgain());
    this.unsubscribeGameState = this.gameStateMachine.subscribe(
      this.handleGameStateTransition,
    );
    this.desktopInput = new DesktopInput({
      inputManager: this.inputManager,
      canvas: elements.canvas,
      onPointerLockChange: this.handlePointerLockChange,
      onPointerLockError: this.handlePointerLockError,
    });
    this.playerController = new PlayerController(
      this.cameraManager.camera,
      this.inputManager,
      () => this.desktopInput.isPointerLocked(),
      this.worldCollision,
      this.room.getPlayerSpawn(),
    );
    this.gameLoop = new GameLoop(
      (deltaSeconds) => this.fixedUpdate(deltaSeconds),
      () => this.render(),
      undefined,
      {
        onFrameStart: () => this.updateLook(),
        onFrameEnd: () => this.inputManager.endFrame(),
      },
    );
    this.debugRuntime = this.createDebugRuntime();

    elements.pointerLockPrompt.addEventListener(
      'click',
      this.handleResumeClick,
    );
  }

  public async initialize(): Promise<void> {
    if (this.initialized || this.destroyed) {
      return;
    }

    this.startScreen.setBusy(true);
    this.gameStateMachine.transitionTo('loading');
    await Promise.all([
      this.platformManager.initialize(),
      this.audioManager.initialize(),
    ]);

    const platform = this.platformManager.activeAdapter;
    platform.loadingStart();

    try {
      await this.room.loadAssets(this.assetManager);
      this.registerActiveRoomCatalog();
      this.rendererManager.resize();
      this.desktopInput.attach();
      this.startScreen.onStart(() => this.startExperience());
      this.gameStateMachine.transitionTo('main-menu');
      this.render();
      this.initialized = true;
    } finally {
      platform.loadingStop();
    }

    this.startScreen.setBusy(false);
  }

  public dispose(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.setGameplayActive(false);
    this.gameLoop.stop();
    this.startScreen.dispose();
    this.pauseScreen.dispose();
    this.phaseTimerDisplay.dispose();
    this.blackoutView.dispose();
    this.reportHud.dispose();
    this.roomCompleteBanner.dispose();
    this.gameOverScreen.dispose();
    this.victoryScreen.dispose();
    this.targetReportHighlight.dispose(this.scene);
    this.debugRuntime?.dispose();
    this.roomPreloader.dispose();
    this.desktopInput.detach();
    this.unsubscribeGameState();
    this.runTimer.stop();
    this.blackoutTimeline.reset();
    this.roomAudioDirector.reset();
    this.anomalySystem.restore();
    void this.audioManager.dispose().catch((error: unknown) => {
      console.warn('Audio could not be disposed cleanly.', error);
    });

    this.elements.pointerLockPrompt.removeEventListener(
      'click',
      this.handleResumeClick,
    );
    this.room.unmount();
    this.rendererManager.dispose();

    this.scene.clear();
  }

  private async startExperience(): Promise<void> {
    if (
      this.destroyed ||
      this.gameStateMachine.currentState !== 'main-menu'
    ) {
      return;
    }

    this.experienceStarted = true;
    this.prepareNewRun();
    this.gameStateMachine.transitionTo('room-intro');
    this.resetPlayer();
    this.rendererManager.resize();
    this.gameLoop.start();
    this.setGameplayActive(true);
    const audioUnlock = this.unlockAudio();
    const pointerLock = this.requestPointerLock();
    await Promise.all([audioUnlock, pointerLock]);
  }

  private updateLook(): void {
    if (
      this.debugRuntime?.isLevelBuilderOpen() === true ||
      this.gameStateMachine.currentState === 'blackout' ||
      this.gameStateMachine.currentState === 'game-over' ||
      this.gameStateMachine.currentState === 'victory'
    ) {
      return;
    }

    this.playerController.updateLook();
  }

  private fixedUpdate(deltaSeconds: number): void {
    if (this.debugRuntime?.isLevelBuilderOpen() === true) {
      return;
    }

    const state = this.gameStateMachine.currentState;

    if (state !== 'blackout' && state !== 'room-transition') {
      this.playerController.fixedUpdate(deltaSeconds);
    }

    if (state === 'observation') {
      const phase = this.runTimer.getSnapshot().phase;

      if (phase?.phase === 'observation' && phase.expired) {
        this.beginBlackout();
      }
    } else if (state === 'search') {
      const phase = this.runTimer.getSnapshot().phase;

      if (phase?.phase === 'search' && phase.expired) {
        this.registerRunError('timeout');
      }
    } else if (state === 'room-complete') {
      this.exitDoorController.update(deltaSeconds);
      const door = this.exitDoorController.getSnapshot();

      if (
        door.state === 'open' &&
        this.exitThresholdDetector.hasCrossed(
          this.playerController.getPosition(),
        )
      ) {
        if (
          this.roomProgression.hasNextRoom &&
          this.isRoomBuilt(
            this.roomProgression.currentStep.roomIndex + 1,
          )
        ) {
          this.gameStateMachine.transitionTo('room-transition');
          void this.transitionToNextRoom();
        } else {
          this.gameStateMachine.transitionTo('victory');
        }
      }
    }
  }

  private render(): void {
    this.handleDebugVisibilityInput();
    const levelBuilderOpen =
      this.debugRuntime?.isLevelBuilderOpen() === true;

    if (levelBuilderOpen) {
      this.hidePointerLockPrompt();
      this.debugRuntime?.update();
    } else {
      this.playerController.synchronizeCamera();
    }

    if (
      this.gameStateMachine.currentState === 'game-over' &&
      this.gameOverRevealTarget !== null
    ) {
      this.cameraManager.camera.lookAt(this.gameOverRevealCenter);
    }

    this.updateBlackout();
    if (levelBuilderOpen) {
      this.aimedTargetId = null;
      this.targetReportHighlight.setAimedTarget(null);
    } else {
      this.updateTargetSelection();
    }
    this.targetReportHighlight.update();
    this.rendererManager.render(this.scene, this.cameraManager.camera);
    this.phaseTimerDisplay.update(
      this.gameStateMachine.currentState,
      this.runTimer.getSnapshot(),
    );
    const reportSnapshot = this.reportSystem.getSnapshot();
    const errorSnapshot = this.runErrorTracker.getSnapshot();
    this.reportHud.update({
      state: this.gameStateMachine.currentState,
      remainingCount: reportSnapshot.remainingCount,
      aimedAtTarget: this.aimedTargetId !== null,
      errorCount: errorSnapshot.errorCount,
      maximumErrors: errorSnapshot.maximumErrors,
    });
    this.roomCompleteBanner.update();
    if (!levelBuilderOpen) {
      this.debugRuntime?.update();
    }
  }

  private resetPlayer(): void {
    this.inputManager.reset();
    this.aimedTargetId = null;
    this.lastSelectedTargetId = null;
    this.playerController.reset(this.room.getPlayerSpawn());
  }

  private configureRoomGameplaySystems(room: PlayableRoom): void {
    this.targetSelector = new AnomalyTargetSelector(
      room.getAnomalyTargetRegistry(),
    );
    this.anomalySystem = new RoomAnomalySystem(
      room.getAnomalyTargetRegistry(),
      () => {
        this.worldCollision.buildFromObject(room.getCollisionRoot());
      },
    );
    this.exitDoorController = new ExitDoorController({
      getDoor: () => room.getExitDoor(),
      setCollisionEnabled: (enabled) =>
        room.setExitDoorCollisionEnabled(enabled),
      setPortalProgress: (progress) => room.setExitPortalProgress(progress),
    });
    this.exitThresholdDetector = new ExitThresholdDetector(
      room.getExitThresholdDefinition(),
    );
  }

  private registerActiveRoomCatalog(): void {
    const catalogs = {
      bathroom: bathroomAnomalyCatalog,
      'first-corridor': corridorAnomalyCatalog,
      'greybox-bedroom': bedroomAnomalyCatalog,
    } as const;
    const catalog = catalogs[this.room.definition.id as keyof typeof catalogs];

    if (catalog === undefined) {
      throw new Error(
        `No Level Builder catalog is registered for room "${this.room.definition.id}".`,
      );
    }

    this.anomalySystem.registerLevelBuilderCatalog(
      parseLevelBuilderDocument(JSON.stringify(catalog)),
      this.room.definition.id,
    );
  }

  private transitionToNextRoom(): Promise<void> {
    if (this.roomTransitionPromise !== null) {
      return this.roomTransitionPromise;
    }

    const transition = this.performRoomTransition().catch((error: unknown) => {
      console.error('Room transition failed.', error);
      this.blackoutView.reset();
      this.setGameplayActive(false);
    });
    this.roomTransitionPromise = transition;
    void transition.finally(() => {
      if (this.roomTransitionPromise === transition) {
        this.roomTransitionPromise = null;
      }
    });
    return transition;
  }

  private async performRoomTransition(): Promise<void> {
    const runIdentity = this.runIdentity;

    if (runIdentity === null) {
      throw new Error('A run identity is required before changing rooms.');
    }

    const previousRoom = this.room;
    const nextRoomIndex = this.roomProgression.currentStep.roomIndex + 1;
    let nextRoom: PlayableRoom | null = null;
    this.setGameplayActive(false);
    this.roomCompleteBanner.reset();
    this.roomAudioDirector.finishRoom();
    this.blackoutView.begin(previousRoom.getVisualRoot());
    this.blackoutView.apply({
      stage: 'full-black',
      elapsedMs: 0,
      overlayOpacity: 1,
      lightMultiplier: 0,
      anomalyApplicationDue: false,
      complete: false,
    });
    this.debugRuntime?.dispose();
    this.debugRuntime = null;
    this.targetReportHighlight.reset();
    this.anomalySystem.restore();

    try {
      nextRoom = await this.roomPreloader.consume(nextRoomIndex, {
        scene: this.scene,
        worldCollision: this.worldCollision,
      });

      if (nextRoom === null) {
        nextRoom = this.createRoom(nextRoomIndex);
        nextRoom.mount({
          scene: this.scene,
          worldCollision: this.worldCollision,
        });
        await nextRoom.loadAssets(this.assetManager);
      }
    } catch (error: unknown) {
      console.error('The next room could not be loaded.', error);
      nextRoom?.unmount();
      previousRoom.unmount();
      previousRoom.mount({
        scene: this.scene,
        worldCollision: this.worldCollision,
      });
      await previousRoom.loadAssets(this.assetManager);
      this.configureRoomGameplaySystems(previousRoom);
      this.registerActiveRoomCatalog();
      this.prepareActiveRoomBaseline(runIdentity.seed);
      this.finishRoomTransition();
      return;
    }

    if (nextRoom === null) {
      throw new Error(
        `Room ${nextRoomIndex + 1} was neither preloaded nor loaded during transition.`,
      );
    }

    previousRoom.unmount();
    this.room = nextRoom;
    const advancedStep = this.roomProgression.advance();

    if (
      advancedStep === null ||
      advancedStep.roomIndex !== nextRoomIndex ||
      advancedStep.id !== nextRoom.definition.id
    ) {
      throw new Error(
        `Escape-route room ${nextRoomIndex + 1} does not match "${nextRoom.definition.id}".`,
      );
    }

    this.configureRoomGameplaySystems(nextRoom);
    this.registerActiveRoomCatalog();
    this.prepareActiveRoomBaseline(runIdentity.seed);
    this.finishRoomTransition();
  }

  private prepareActiveRoomBaseline(runSeed: number): void {
    this.reportSystem.reset();
    this.pendingAnomalyPlan = null;
    this.anomalyAppliedDuringBlackout = false;
    this.exitDoorController.reset();
    this.anomalySystem.prepareRunBaseline({
      runSeed,
      roomIndex: this.roomProgression.currentStep.roomIndex,
      roomId: this.roomProgression.currentStep.id,
    });
    this.rendererManager.invalidateShadows();
  }

  private finishRoomTransition(): void {
    this.resetPlayer();
    this.blackoutView.reset();
    this.roomAudioDirector.startRoom();
    this.debugRuntime = this.createDebugRuntime();
    this.preloadNextBuiltRoom();
    this.gameStateMachine.transitionTo('room-intro');

    if (this.desktopInput.isPointerLocked()) {
      this.gameStateMachine.transitionTo('observation');
      this.setGameplayActive(true);
    } else {
      this.showPointerLockPrompt(POINTER_LOCK_COPY.resume);
    }
  }

  private createRoom(roomIndex: number): PlayableRoom {
    if (roomIndex === 1) {
      return new GreyboxBathroom();
    }

    if (roomIndex === 2) {
      return new GreyboxCorridor();
    }

    throw new Error(`Room ${roomIndex + 1} has not been built yet.`);
  }

  private isRoomBuilt(roomIndex: number): boolean {
    return roomIndex >= 0 && roomIndex <= 2;
  }

  private preloadNextBuiltRoom(): void {
    const nextRoomIndex =
      this.roomProgression.currentStep.roomIndex + 1;

    if (!this.isRoomBuilt(nextRoomIndex)) {
      return;
    }

    void this.roomPreloader.preloadRoom(nextRoomIndex);
  }

  private createDebugRuntime(): GreyboxDebugRuntime | null {
    if (!import.meta.env.DEV) {
      return null;
    }

    const runtime = new GreyboxDebugRuntime({
      scene: this.scene,
      camera: this.cameraManager.camera,
      canvas: this.elements.canvas,
      hudLayer: this.elements.hudLayer,
      inputManager: this.inputManager,
      desktopInput: this.desktopInput,
      playerController: this.playerController,
      rendererManager: this.rendererManager,
      gameLoop: this.gameLoop,
      worldCollision: this.worldCollision,
      room: this.room,
      anomalySystem: this.anomalySystem,
      isGameActive: () => this.gameplayActive,
      getGameState: () => this.gameStateMachine.currentState,
      getTimingSnapshot: () => this.runTimer.getSnapshot(),
      getAudioSnapshot: () => this.audioManager.getSnapshot(),
      getAimedTargetId: () => this.aimedTargetId,
      getLastSelectedTargetId: () => this.lastSelectedTargetId,
      getReportSnapshot: () => this.reportSystem.getSnapshot(),
      getRunErrorSnapshot: () => this.runErrorTracker.getSnapshot(),
      getExitDoorSnapshot: () => this.exitDoorController.getSnapshot(),
      getRunIdentity: () => this.runIdentity,
      getPendingAnomalyPlan: () => this.pendingAnomalyPlan,
      getBlackoutSnapshot: () => this.blackoutTimeline.getSnapshot(),
      isAnomalyAppliedDuringBlackout: () =>
        this.anomalyAppliedDuringBlackout,
      setEffectsVolume: (volume) => {
        this.audioManager.setCategoryVolume('effects', volume);
        this.audioManager.setCategoryVolume('interface', volume);
      },
      setMusicVolume: (volume) => {
        this.audioManager.setCategoryVolume('music', volume);
        this.audioManager.setCategoryVolume('ambience', volume);
      },
      setNextRunSeed: (seed) => {
        this.nextRunSeedOverride = seed;
      },
      onLevelBuilderOpen: () => this.hidePointerLockPrompt(),
    });
    runtime.setVisible(this.debugVisible);
    return runtime;
  }

  private handleDebugVisibilityInput(): void {
    if (
      !this.inputManager.wasActionPressed('toggle-debug') ||
      this.debugRuntime === null ||
      this.debugRuntime.isLevelBuilderOpen()
    ) {
      return;
    }

    this.debugVisible = !this.debugVisible;
    this.debugRuntime.setVisible(this.debugVisible);
  }

  private updateTargetSelection(): void {
    if (this.gameStateMachine.currentState === 'blackout') {
      this.aimedTargetId = null;
      this.targetReportHighlight.setAimedTarget(null);
      return;
    }

    const state = this.gameStateMachine.currentState;
    const target = this.targetSelector.getTargetAtScreenCenter(
      this.cameraManager.camera,
      (candidate) =>
        state !== 'search' ||
        this.reportSystem.isTargetSelectable(candidate.id),
    );
    this.aimedTargetId = target?.id ?? null;
    this.targetReportHighlight.setAimedTarget(
      state === 'search' ? (target?.object ?? null) : null,
    );

    if (
      !this.inputManager.wasActionPressed('interact') ||
      !this.desktopInput.isPointerLocked()
    ) {
      return;
    }

    if (state === 'observation') {
      this.lastSelectedTargetId = this.aimedTargetId;
      return;
    }

    if (state !== 'search') {
      return;
    }

    this.lastSelectedTargetId = this.aimedTargetId;
    const result = this.reportSystem.report(this.aimedTargetId);

    if (result.outcome === 'correct') {
      if (target === null) {
        throw new Error('A correct report requires a selected anomaly target.');
      }

      this.targetReportHighlight.show(target.object);
      this.reportHud.showFeedback('correct');
      this.audioManager.play('report-correct');

      if (result.roomComplete) {
        this.gameStateMachine.transitionTo('room-complete');
      }
    } else if (result.outcome === 'incorrect') {
      this.registerRunError('incorrect-report');
    }
  }

  private registerRunError(kind: RunErrorKind): void {
    const errorSnapshot = this.runErrorTracker.recordError(kind);
    this.runTimer.addPenalty(
      kind === 'incorrect-report' ? 'incorrectReport' : 'timeout',
    );
    this.reportHud.showFeedback(
      kind === 'incorrect-report' ? 'incorrect' : 'timeout',
    );
    this.audioManager.play('report-incorrect');

    if (errorSnapshot.gameOver) {
      this.gameStateMachine.transitionTo('game-over');
      return;
    }

    if (kind === 'timeout') {
      this.runTimer.startPhase(
        'search',
        this.roomProgression.currentStep.searchDurationMs,
      );
    }
  }

  private prepareNewRun(): void {
    this.roomProgression.reset();

    if (this.room.definition.id !== this.roomProgression.currentStep.id) {
      throw new Error(
        `A new run must start in "${this.roomProgression.currentStep.id}", received "${this.room.definition.id}".`,
      );
    }

    this.roomAudioDirector.reset();
    this.blackoutTimeline.reset();
    this.blackoutView.reset();
    this.reportHud.reset();
    this.roomCompleteBanner.reset();
    this.reportSystem.reset();
    this.runErrorTracker.reset();
    this.targetReportHighlight.reset();
    this.gameOverRevealTarget = null;
    this.exitDoorController.reset();
    this.anomalySystem.restore();
    this.rendererManager.invalidateShadows();
    this.runTimer.reset();
    this.pendingAnomalyPlan = null;
    this.anomalyAppliedDuringBlackout = false;
    this.runIdentity = createRunIdentity(
      this.nextRunSeedOverride ?? undefined,
    );
    this.anomalySystem.prepareRunBaseline({
      runSeed: this.runIdentity.seed,
      roomIndex: this.roomProgression.currentStep.roomIndex,
      roomId: this.roomProgression.currentStep.id,
    });
    this.preloadNextBuiltRoom();
    this.rendererManager.invalidateShadows();
  }

  private async tryAgain(): Promise<void> {
    await this.restartFinishedRun('game-over');
  }

  private async playAgain(): Promise<void> {
    await this.restartFinishedRun('victory');
  }

  private async restartFinishedRun(
    finishedState: 'game-over' | 'victory',
  ): Promise<void> {
    if (
      this.destroyed ||
      this.gameStateMachine.currentState !== finishedState
    ) {
      return;
    }

    await this.ensureFirstRoomMounted();

    if (this.destroyed || this.gameStateMachine.currentState !== finishedState) {
      return;
    }

    this.prepareNewRun();
    this.gameStateMachine.transitionTo('room-intro');
    this.resetPlayer();
    this.rendererManager.resize();
    this.setGameplayActive(true);
    await Promise.all([this.unlockAudio(), this.requestPointerLock()]);
  }

  private async ensureFirstRoomMounted(): Promise<void> {
    if (this.room.definition.id === 'greybox-bedroom') {
      return;
    }

    this.roomPreloader.cancel();
    this.debugRuntime?.dispose();
    this.debugRuntime = null;
    this.anomalySystem.restore();
    this.room.unmount();
    const firstRoom = new GreyboxBedroom();
    firstRoom.mount({
      scene: this.scene,
      worldCollision: this.worldCollision,
    });
    await firstRoom.loadAssets(this.assetManager);
    this.room = firstRoom;
    this.configureRoomGameplaySystems(firstRoom);
    this.registerActiveRoomCatalog();
    this.debugRuntime = this.createDebugRuntime();
    this.rendererManager.invalidateShadows();
  }

  private beginBlackout(): void {
    const runIdentity = this.runIdentity;

    if (runIdentity === null) {
      throw new Error('A run identity is required before blackout.');
    }

    this.pendingAnomalyPlan = this.generateAnomalyPlan(runIdentity.seed);
    this.anomalyAppliedDuringBlackout = false;
    this.gameStateMachine.transitionTo('blackout');
  }

  private generateAnomalyPlan(runSeed: number): AnomalyPlan {
    const step = this.roomProgression.currentStep;
    const options = {
      runSeed,
      roomIndex: step.roomIndex,
      roomId: step.id,
      difficulty: step.difficultyRank,
      count: selectAnomalyCount(step, runSeed),
    } as const;

    try {
      return this.anomalySystem.generatePlan(options);
    } catch (error: unknown) {
      console.error(
        `Unable to generate anomalies for room "${options.roomId}" with run seed ${runSeed}.`,
        error,
      );

      if (import.meta.env.DEV) {
        throw error;
      }

      const fallbackTarget = this.room
        .getAnomalyTargets()
        .find(
          (target) =>
            !this.anomalySystem
              .getBaselineSnapshot()
              ?.hiddenTargetIds.includes(target.id) &&
            target.variants.some((variant) => variant.kind === 'hide'),
        );
      const fallbackVariant = fallbackTarget?.variants.find(
        (variant) => variant.kind === 'hide',
      );

      if (fallbackTarget === undefined || fallbackVariant === undefined) {
        throw error;
      }

      return {
        runSeed,
        roomSeed: deriveRoomSeed(
          runSeed,
          step.roomIndex,
          options.roomId,
        ),
        roomId: options.roomId,
        roomIndex: step.roomIndex,
        difficulty: step.difficultyRank,
        anomalies: [
          {
            targetId: fallbackTarget.id,
            kind: fallbackVariant.kind,
            variantId: fallbackVariant.id,
          },
        ],
      };
    }
  }

  private updateBlackout(): void {
    if (this.gameStateMachine.currentState !== 'blackout') {
      return;
    }

    const snapshot = this.blackoutTimeline.getSnapshot();
    this.roomAudioDirector.updateBlackout(snapshot);
    this.blackoutView.apply(snapshot);

    if (
      snapshot.anomalyApplicationDue &&
      !this.anomalyAppliedDuringBlackout
    ) {
      const plan = this.pendingAnomalyPlan;

      if (plan === null) {
        throw new Error('Blackout reached its application point without a plan.');
      }

      this.blackoutView.apply(createApplicationFrameSnapshot(snapshot));
      this.anomalySystem.applyPlan(plan);
      this.rendererManager.invalidateShadows();
      this.anomalyAppliedDuringBlackout = true;
      return;
    }

    if (snapshot.complete) {
      this.blackoutTimeline.reset();
      this.blackoutView.reset();
      this.pendingAnomalyPlan = null;
      this.gameStateMachine.transitionTo('search');
    }
  }

  private async requestPointerLock(): Promise<void> {
    try {
      await this.desktopInput.requestPointerLock();
    } catch (error: unknown) {
      console.warn('Pointer lock could not be activated.', error);
      this.handlePointerLockFailure();
    }
  }

  private async unlockAudio(): Promise<void> {
    try {
      await this.audioManager.unlock();

      if (
        this.experienceStarted &&
        this.gameStateMachine.currentState !== 'main-menu' &&
        this.gameStateMachine.currentState !== 'game-over' &&
        this.gameStateMachine.currentState !== 'victory'
      ) {
        this.roomAudioDirector.startRoom();
      }
    } catch (error: unknown) {
      console.warn('Audio could not be activated.', error);
    }
  }

  private setGameplayActive(active: boolean): void {
    if (this.gameplayActive === active) {
      return;
    }

    this.gameplayActive = active;

    if (active) {
      this.platformManager.activeAdapter.gameplayStart();
    } else {
      this.platformManager.activeAdapter.gameplayStop();
    }
  }

  private showPointerLockPrompt(message: string): void {
    this.pauseScreen.show(message);
  }

  private hidePointerLockPrompt(): void {
    this.pauseScreen.hide();
  }

  private handlePointerLockFailure(): void {
    this.gameStateMachine.pause();
    this.setGameplayActive(false);
    this.showPointerLockPrompt(POINTER_LOCK_COPY.unavailable);
  }

  private readonly handleResumeClick = (): void => {
    this.pauseScreen.setBusy(true);
    void this.unlockAudio();
    void this.requestPointerLock();
  };

  private readonly handlePointerLockChange = (locked: boolean): void => {
    if (!this.experienceStarted) {
      return;
    }

    if (locked) {
      void this.unlockAudio();
      this.hidePointerLockPrompt();
      this.elements.canvas.focus();
      this.resumeGameplayState();
      this.setGameplayActive(true);
      return;
    }

    if (this.debugRuntime?.isLevelBuilderOpen() === true) {
      this.gameStateMachine.pause();
      this.setGameplayActive(false);
      this.hidePointerLockPrompt();
      return;
    }

    if (
      this.gameStateMachine.currentState === 'game-over' ||
      this.gameStateMachine.currentState === 'victory' ||
      this.gameStateMachine.currentState === 'main-menu'
    ) {
      this.hidePointerLockPrompt();
      this.setGameplayActive(false);
      return;
    }

    this.gameStateMachine.pause();
    this.setGameplayActive(false);
    this.showPointerLockPrompt(POINTER_LOCK_COPY.resume);
  };

  private readonly handlePointerLockError = (_error: Error): void => {
    if (this.experienceStarted) {
      this.handlePointerLockFailure();
    }
  };

  private resumeGameplayState(): void {
    if (this.gameStateMachine.isPaused) {
      this.gameStateMachine.resume();
    }

    if (this.gameStateMachine.currentState === 'room-intro') {
      this.gameStateMachine.transitionTo('observation');
    }
  }

  private readonly handleGameStateTransition = (
    transition: GameStateTransition,
  ): void => {
    if (transition.to === 'paused') {
      if (transition.from === 'blackout') {
        this.blackoutTimeline.pause();
      }

      this.runTimer.pause();
      void this.audioManager.suspend().catch((error: unknown) => {
        console.warn('Audio could not be suspended cleanly.', error);
      });
      return;
    }

    if (transition.from === 'paused') {
      if (transition.to === 'main-menu') {
        this.runTimer.stop();
        this.runTimer.clearPhase();
      } else {
        this.runTimer.resume();

        if (transition.to === 'blackout') {
          this.blackoutTimeline.resume();
        }
      }
      return;
    }

    switch (transition.to) {
      case 'room-intro':
        this.gameOverScreen.hide();
        this.victoryScreen.hide();
        break;
      case 'observation':
        if (!this.runTimer.hasStarted || this.runTimer.isFinished) {
          this.runTimer.startRun();
        }
        this.runTimer.startPhase(
          'observation',
          this.roomProgression.currentStep.observationDurationMs,
        );
        break;
      case 'blackout':
        this.runTimer.clearPhase();
        this.blackoutTimeline.start();
        this.blackoutView.begin(this.room.getVisualRoot());
        this.roomAudioDirector.beginBlackout();
        break;
      case 'room-complete':
        this.runTimer.clearPhase();
        this.roomCompleteBanner.show();
        if (this.exitDoorController.unlock()) {
          this.roomAudioDirector.openExitDoor();
        }
        break;
      case 'search':
        {
          const activePlan = this.anomalySystem.getActivePlan();

          if (activePlan === null) {
            throw new Error(
              'A room anomaly plan is required before reporting can start.',
            );
          }

          this.reportSystem.startRound(activePlan);
        }
        this.blackoutTimeline.reset();
        this.blackoutView.reset();
        this.runTimer.startPhase(
          'search',
          this.roomProgression.currentStep.searchDurationMs,
        );
        break;
      case 'game-over': {
        this.roomCompleteBanner.reset();
        this.runTimer.clearPhase();
        this.runTimer.stop();
        const errors = this.runErrorTracker.getSnapshot();
        const activePlan = this.anomalySystem.getActivePlan();
        const missedAnomaly = describeFirstAnomaly(activePlan);
        const revealTarget =
          missedAnomaly === null
            ? null
            : this.room
                .getAnomalyTargetRegistry()
                .getById(missedAnomaly.targetId);

        if (revealTarget !== null) {
          this.gameOverRevealTarget = revealTarget.object;
          const bounds = new THREE.Box3().setFromObject(revealTarget.object);

          if (bounds.isEmpty()) {
            revealTarget.object.getWorldPosition(this.gameOverRevealCenter);
          } else {
            bounds.getCenter(this.gameOverRevealCenter);
          }

          this.targetReportHighlight.showMissed(revealTarget.object);
        }

        this.gameOverScreen.show({
          roomNumber: this.roomProgression.currentStep.roomNumber,
          timing: this.runTimer.getSnapshot(),
          errorCount: errors.errorCount,
          maximumErrors: errors.maximumErrors,
          missedAnomaly,
        });
        this.roomAudioDirector.finishRoom();
        this.setGameplayActive(false);
        this.desktopInput.releasePointerLock();
        break;
      }
      case 'victory': {
        this.roomCompleteBanner.reset();
        this.runTimer.clearPhase();
        this.runTimer.stop();
        const errors = this.runErrorTracker.getSnapshot();
        const timing = this.runTimer.getSnapshot();
        this.victoryScreen.show({
          timing,
          errorCount: errors.errorCount,
          maximumErrors: errors.maximumErrors,
        });
        this.roomAudioDirector.finishRoom();
        this.setGameplayActive(false);
        this.desktopInput.releasePointerLock();
        void this.platformManager.activeAdapter
          .submitEscapeTime(timing.finalTimeMs)
          .catch((error: unknown) => {
            console.warn('Escape time could not be submitted.', error);
          });
        break;
      }
      case 'main-menu':
        this.roomCompleteBanner.reset();
        this.gameOverScreen.hide();
        this.victoryScreen.hide();
        this.blackoutTimeline.reset();
        this.blackoutView.reset();
        this.runTimer.stop();
        this.runTimer.clearPhase();
        this.roomAudioDirector.reset();
        break;
      default:
        break;
    }
  };
}

function createApplicationFrameSnapshot(
  snapshot: BlackoutSnapshot,
): BlackoutSnapshot {
  return {
    ...snapshot,
    stage: 'full-black',
    overlayOpacity: 1,
    lightMultiplier: 0,
    complete: false,
  };
}

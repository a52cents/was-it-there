import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import kloppenheimNightSkyUrl from '../assets/environment/kloppenheim-07-pure-sky-1k.hdr?url';
import { AudioManager } from '../audio/AudioManager';
import { RoomAudioDirector } from '../audio/RoomAudioDirector';
import { deriveRoomSeed } from '../core/random/SeededRandom';
import { STORY_EVENT_CATALOG } from '../content/story/StoryEventCatalog';
import {
  STORY_DISAPPEARANCE_PROTECTED_TARGET_IDS_BY_ROOM,
  STORY_INTERACTION_CATALOG,
} from '../content/story/StoryInteractionCatalog';
import { GreyboxDebugRuntime } from '../debug/GreyboxDebugRuntime';
import { parseLevelBuilderDocument } from '../debug/level-builder/LevelBuilderDocument';
import {
  BlackoutTimeline,
  type BlackoutSnapshot,
} from '../gameplay/anomalies/BlackoutTimeline';
import type { AnomalyPlan } from '../gameplay/anomalies/AnomalyGenerator';
import { describeMissedAnomalyForMode } from '../gameplay/anomalies/AnomalyPresentation';
import { RoomAnomalySystem } from '../gameplay/anomalies/RoomAnomalySystem';
import { AnomalyTargetSelector } from '../gameplay/interaction/AnomalyTargetSelector';
import { RoomReportSystem } from '../gameplay/interaction/RoomReportSystem';
import { TargetReportHighlight } from '../gameplay/interaction/TargetReportHighlight';
import { ExitDoorController } from '../gameplay/progression/ExitDoorController';
import { ExitThresholdDetector } from '../gameplay/progression/ExitThresholdDetector';
import {
  ESCAPE_ROUTE,
  EscapeRouteProgression,
  selectAnomalyCount,
} from '../gameplay/progression/EscapeRoute';
import {
  createRunIdentity,
  type RunIdentity,
} from '../gameplay/run/RunIdentity';
import type { GameMode } from '../gameplay/run/GameMode';
import {
  RunErrorTracker,
  type RunErrorKind,
} from '../gameplay/run/RunErrorTracker';
import { StoryDirector } from '../gameplay/story/StoryDirector';
import {
  isCurrentStoryRouteFinalRoom,
  resolveFirstChapterOutcome,
  type StoryChapterOutcome,
} from '../gameplay/story/StoryChapterOutcome';
import { StoryEffectRuntime } from '../gameplay/story/StoryEffectRuntime';
import { StoryExitGate } from '../gameplay/story/StoryExitGate';
import { HouseErasureSystem } from '../gameplay/story/HouseErasureSystem';
import {
  HousePressureSystem,
  type HousePressureSnapshot,
} from '../gameplay/story/HousePressureSystem';
import { StoryProgress } from '../gameplay/story/StoryProgress';
import {
  StorySaveRepository,
  createEmptyStoryProgress,
} from '../gameplay/story/StorySaveRepository';
import {
  StoryInteractionRegistry,
  type StoryInteractionDefinition,
} from '../gameplay/story/StoryInteraction';
import { DesktopInput } from '../input/DesktopInput';
import { InputManager } from '../input/InputManager';
import { TouchInput } from '../input/TouchInput';
import type { PlatformManager } from '../platform/PlatformManager';
import { PlayerController } from '../player/PlayerController';
import { CameraManager } from '../rendering/CameraManager';
import { createAtmosphereProfile } from '../rendering/AtmosphereProfile';
import { HousePressureLighting } from '../rendering/HousePressureLighting';
import { RendererManager } from '../rendering/RendererManager';
import { createAmbientSkyTexture } from '../rendering/SceneAmbience';
import {
  SettingsStore,
  type GameSettings,
} from '../settings/SettingsStore';
import { PhaseTimerDisplay } from '../ui/PhaseTimerDisplay';
import { BlackoutView } from '../ui/BlackoutView';
import { GameOverScreen } from '../ui/GameOverScreen';
import { HousePressureView } from '../ui/HousePressureView';
import { PauseScreen } from '../ui/PauseScreen';
import { ReportHud } from '../ui/ReportHud';
import { RoomCompleteBanner } from '../ui/RoomCompleteBanner';
import { StartScreen } from '../ui/StartScreen';
import { StoryIntroScreen } from '../ui/StoryIntroScreen';
import { StoryMemoryView } from '../ui/StoryMemoryView';
import { StoryNotebookScreen } from '../ui/StoryNotebookScreen';
import { StorySubtitleView } from '../ui/StorySubtitleView';
import { VictoryScreen } from '../ui/VictoryScreen';
import { AssetManager } from '../world/assets/AssetManager';
import { GreyboxBathroom } from '../world/rooms/GreyboxBathroom';
import { GreyboxBedroom } from '../world/rooms/GreyboxBedroom';
import { GreyboxCorridor } from '../world/rooms/GreyboxCorridor';
import { GreyboxDiningRoom } from '../world/rooms/GreyboxDiningRoom';
import { GreyboxKitchen } from '../world/rooms/GreyboxKitchen';
import { GreyboxLivingRoom } from '../world/rooms/GreyboxLivingRoom';
import { GreyboxLaundryRoom } from '../world/rooms/GreyboxLaundryRoom';
import { GreyboxEntranceCorridor } from '../world/rooms/GreyboxEntranceCorridor';
import { GreyboxMainHall } from '../world/rooms/GreyboxMainHall';
import { GreyboxOffice } from '../world/rooms/GreyboxOffice';
import type { PlayableRoom } from '../world/rooms/PlayableRoom';
import { RoomPreloader } from '../world/RoomPreloader';
import bathroomAnomalyCatalog from '../world/rooms/greybox-bathroom-anomalies.json';
import bedroomAnomalyCatalog from '../world/rooms/greybox-bedroom-anomalies.json';
import corridorAnomalyCatalog from '../world/rooms/first-corridor-anomalies.json';
import diningRoomAnomalyCatalog from '../world/rooms/dining-room-anomalies.json';
import kitchenAnomalyCatalog from '../world/rooms/kitchen-anomalies.json';
import livingRoomAnomalyCatalog from '../world/rooms/living-room-anomalies.json';
import laundryRoomAnomalyCatalog from '../world/rooms/laundry-room-anomalies.json';
import officeAnomalyCatalog from '../world/rooms/office-anomalies.json';
import entranceCorridorAnomalyCatalog from '../world/rooms/entrance-corridor-anomalies.json';
import mainHallAnomalyCatalog from '../world/rooms/main-hall-anomalies.json';
import { WorldCollision } from '../world/WorldCollision';
import { GameLoop } from './GameLoop';
import {
  GameStateMachine,
  type GameState,
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
  readonly storyModeButton: HTMLButtonElement;
  readonly escapeModeButton: HTMLButtonElement;
  readonly escapeModeDescription: HTMLElement;
  readonly storyNotebookButton: HTMLButtonElement;
  readonly pointerLockPrompt: HTMLButtonElement;
}

const POINTER_LOCK_COPY = {
  resume: 'RETURN TO THE ROOM',
  unavailable: 'RETRY MOUSE CAPTURE',
  touchResume: 'TAP TO RETURN',
} as const;

const GAME_OVER_FADE_DURATION_MS = 650;

const LEVEL_BUILDER_ROOMS = ESCAPE_ROUTE.slice(0, 10).map((step) => ({
  roomIndex: step.roomIndex,
  id: step.id,
  label: `${String(step.roomNumber).padStart(2, '0')} · ${step.displayName}`,
}));

export class GameApp {
  private readonly scene = new THREE.Scene();
  private readonly ambientSkyTexture = createAmbientSkyTexture();
  private ambientEnvironmentTexture: THREE.DataTexture | null = null;
  private readonly gameStateMachine = new GameStateMachine();
  private readonly runTimer = new RunTimer();
  private readonly blackoutTimeline = new BlackoutTimeline();
  private readonly settingsStore = new SettingsStore();
  private settings = this.settingsStore.load();
  private readonly audioManager = new AudioManager();
  private readonly roomAudioDirector = new RoomAudioDirector(
    this.audioManager,
  );
  private readonly cameraManager = new CameraManager();
  private readonly rendererManager: RendererManager;
  private readonly gameLoop: GameLoop;
  private readonly startScreen: StartScreen;
  private readonly storyIntroScreen: StoryIntroScreen;
  private readonly pauseScreen: PauseScreen;
  private readonly phaseTimerDisplay: PhaseTimerDisplay;
  private readonly blackoutView: BlackoutView;
  private readonly housePressureView: HousePressureView;
  private readonly storySubtitleView: StorySubtitleView;
  private readonly storyMemoryView: StoryMemoryView;
  private readonly storyNotebookScreen: StoryNotebookScreen;
  private readonly storyEffectRuntime: StoryEffectRuntime;
  private readonly reportHud: ReportHud;
  private readonly roomCompleteBanner: RoomCompleteBanner;
  private readonly gameOverScreen: GameOverScreen;
  private readonly victoryScreen: VictoryScreen;
  private readonly inputManager = new InputManager();
  private readonly desktopInput: DesktopInput;
  private readonly touchInput: TouchInput;
  private readonly playerController: PlayerController;
  private debugRuntime: GreyboxDebugRuntime | null = null;
  private debugVisible = false;
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
  private readonly storyProgress = new StoryProgress();
  private readonly storyInteractionRegistry = new StoryInteractionRegistry(
    STORY_INTERACTION_CATALOG,
  );
  private readonly storyExitGate = new StoryExitGate(
    this.storyInteractionRegistry,
    this.storyProgress,
  );
  private readonly storyDirector: StoryDirector;
  private readonly storySaveRepository = new StorySaveRepository();
  private readonly houseErasureSystem = new HouseErasureSystem();
  private readonly housePressureSystem = new HousePressureSystem();
  private readonly housePressureLighting = new HousePressureLighting();
  private room: PlayableRoom;
  private targetSelector: AnomalyTargetSelector;
  private anomalySystem: RoomAnomalySystem;
  private readonly reportSystem = new RoomReportSystem();
  private readonly runErrorTracker = new RunErrorTracker();
  private readonly targetReportHighlight: TargetReportHighlight;
  private exitDoorController: ExitDoorController;
  private exitThresholdDetector: ExitThresholdDetector;
  private readonly unsubscribeGameState: () => void;
  private unsubscribeStoryProgress: (() => void) | null = null;

  private initialized = false;
  private destroyed = false;
  private experienceStarted = false;
  private gameplayActive = false;
  private aimedTargetId: string | null = null;
  private aimedStoryInteraction: StoryInteractionDefinition | null = null;
  private lastSelectedTargetId: string | null = null;
  private runIdentity: RunIdentity | null = null;
  private pendingAnomalyPlan: AnomalyPlan | null = null;
  private anomalyAppliedDuringBlackout = false;
  private rewardedReviveUsed = false;
  private gameOverFadeElapsedMs: number | null = null;
  private failedOutcomeRecordedForRun = false;
  private nextRunSeedOverride: number | null = null;
  private gameOverRevealTarget: THREE.Object3D | null = null;
  private readonly gameOverRevealCenter = new THREE.Vector3();
  private roomTransitionPromise: Promise<void> | null = null;
  private levelBuilderRoomChangePromise: Promise<void> | null = null;

  public constructor(
    private readonly elements: GameAppElements,
    private readonly platformManager: PlatformManager,
  ) {
    this.applyAudioSettings(this.settings);
    this.room = new GreyboxBedroom();
    if (this.room.definition.id !== this.roomProgression.currentStep.id) {
      throw new Error(
        `First escape room must be "${this.roomProgression.currentStep.id}", received "${this.room.definition.id}".`,
      );
    }

    this.scene.background = this.ambientSkyTexture;
    this.scene.backgroundIntensity = 0.65;
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
      elements.storyModeButton,
      elements.escapeModeButton,
      elements.escapeModeDescription,
      elements.storyNotebookButton,
    );
    this.storyIntroScreen = new StoryIntroScreen(elements.modalLayer);
    this.pauseScreen = new PauseScreen(
      elements.modalLayer,
      elements.pointerLockPrompt,
      {
        notebookHandler: this.handleOpenNotebookFromPause,
        initialSettings: this.settings,
        onSettingsChange: this.handleSettingsChange,
      },
    );
    this.storyNotebookScreen = new StoryNotebookScreen(
      elements.modalLayer,
    );
    this.storyNotebookScreen.onErase(this.handleEraseStoryProgress);
    this.phaseTimerDisplay = new PhaseTimerDisplay(elements.hudLayer);
    this.blackoutView = new BlackoutView(elements.hudLayer);
    this.housePressureView = new HousePressureView(elements.hudLayer);
    this.storySubtitleView = new StorySubtitleView(elements.hudLayer);
    this.storyMemoryView = new StoryMemoryView(elements.hudLayer);
    this.storyEffectRuntime = new StoryEffectRuntime(
      this.audioManager,
      this.storySubtitleView,
      this.storyMemoryView,
    );
    this.storyDirector = new StoryDirector(
      STORY_EVENT_CATALOG,
      this.storyProgress,
      {
        onEffect: (execution) => this.storyEffectRuntime.execute(execution),
        onRoomExited: () => this.storyEffectRuntime.reset(),
      },
    );
    this.reportHud = new ReportHud(elements.hudLayer);
    this.roomCompleteBanner = new RoomCompleteBanner(elements.hudLayer);
    this.gameOverScreen = new GameOverScreen(elements.modalLayer);
    this.gameOverScreen.onTryAgain(() => this.tryAgain());
    this.gameOverScreen.onRewardedContinue(() =>
      this.continueWithRewardedAd(),
    );
    this.victoryScreen = new VictoryScreen(elements.modalLayer);
    this.victoryScreen.onPlayAgain(() => this.playAgain());
    this.victoryScreen.onReturnToMenu(() => this.returnToModeSelect());
    this.unsubscribeGameState = this.gameStateMachine.subscribe(
      this.handleGameStateTransition,
    );
    this.desktopInput = new DesktopInput({
      inputManager: this.inputManager,
      canvas: elements.canvas,
      onPointerLockChange: this.handlePointerLockChange,
      onPointerLockError: this.handlePointerLockError,
    });
    this.touchInput = new TouchInput({
      inputManager: this.inputManager,
      canvas: elements.canvas,
      hudLayer: elements.hudLayer,
      onPause: this.handleTouchPause,
    });
    this.playerController = new PlayerController(
      this.cameraManager.camera,
      this.inputManager,
      () => this.isGameplayInputActive(),
      this.worldCollision,
      this.room.getPlayerSpawn(),
    );
    this.playerController.setLookSensitivityMultiplier(
      this.settings.lookSensitivity,
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
    elements.storyNotebookButton.addEventListener(
      'click',
      this.handleOpenNotebookFromMenu,
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
      await Promise.all([
        this.room.loadAssets(this.assetManager),
        this.loadAmbientEnvironment(),
      ]);
      this.housePressureLighting.bind(
        this.room.getVisualRoot(),
        this.scene,
      );
      this.registerActiveRoomCatalog();
      this.rendererManager.resize();
      this.desktopInput.attach();
      this.touchInput.attach();
      this.startScreen.onStart((mode) => this.startExperience(mode));
      const storySave = this.storySaveRepository.load();
      this.storyProgress.hydrate(storySave.progress);
      this.unsubscribeStoryProgress = this.storyProgress.subscribe(
        (progress) => {
          this.storySaveRepository.saveProgress(progress);
          this.storyNotebookScreen.refresh(progress);
        },
      );
      this.startScreen.setEscapeUnlocked(storySave.escapeUnlocked);
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
    this.storyIntroScreen.dispose();
    this.pauseScreen.dispose();
    this.storyNotebookScreen.dispose();
    this.phaseTimerDisplay.dispose();
    this.blackoutView.dispose();
    this.housePressureView.dispose();
    this.storyEffectRuntime.reset();
    this.storySubtitleView.dispose();
    this.storyMemoryView.dispose();
    this.reportHud.dispose();
    this.roomCompleteBanner.dispose();
    this.gameOverScreen.dispose();
    this.victoryScreen.dispose();
    this.targetReportHighlight.dispose(this.scene);
    this.debugRuntime?.dispose();
    this.roomPreloader.dispose();
    this.desktopInput.detach();
    this.touchInput.detach();
    this.unsubscribeGameState();
    this.unsubscribeStoryProgress?.();
    this.unsubscribeStoryProgress = null;
    this.runTimer.stop();
    this.storyDirector.stop();
    this.houseErasureSystem.release();
    this.housePressureLighting.release();
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
    this.elements.storyNotebookButton.removeEventListener(
      'click',
      this.handleOpenNotebookFromMenu,
    );
    this.room.unmount();
    this.rendererManager.dispose();

    this.scene.background = null;
    this.scene.environment = null;
    this.ambientEnvironmentTexture?.dispose();
    this.ambientEnvironmentTexture = null;
    this.ambientSkyTexture.dispose();
    this.scene.clear();
  }

  private async loadAmbientEnvironment(): Promise<void> {
    const texture = await new HDRLoader().loadAsync(kloppenheimNightSkyUrl);

    if (this.destroyed) {
      texture.dispose();
      return;
    }

    texture.name = 'TEXTURE_KloppenheimNightSky_HDR';
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.ambientEnvironmentTexture?.dispose();
    this.ambientEnvironmentTexture = texture;
    this.scene.background = texture;
    this.scene.backgroundIntensity = 0.2;
    this.scene.backgroundBlurriness = 0.12;
    this.scene.backgroundRotation.y = Math.PI * 0.62;
    this.scene.environment = texture;
    this.scene.environmentIntensity = 0.05;
    this.scene.environmentRotation.y = Math.PI * 0.62;
  }

  private async startExperience(mode: GameMode): Promise<void> {
    if (
      this.destroyed ||
      this.gameStateMachine.currentState !== 'main-menu'
    ) {
      return;
    }

    if (mode === 'story') {
      await this.storyIntroScreen.present();

      if (
        this.destroyed ||
        this.gameStateMachine.currentState !== 'main-menu'
      ) {
        return;
      }
    }

    this.experienceStarted = true;
    this.prepareNewRun(mode);
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
      this.gameStateMachine.currentState === 'failure-sequence' ||
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
    if (state !== 'failure-sequence') {
      const deltaMs = deltaSeconds * 1_000;
      this.storyDirector.update(deltaMs);
      this.storyEffectRuntime.update(deltaMs);
    }

    const housePressure = this.housePressureSystem.update(
      deltaSeconds * 1_000,
    );
    this.applyHousePressure(housePressure);

    if (state === 'failure-sequence') {
      this.houseErasureSystem.applyFailure(housePressure.failureProgress);
    }

    if (state === 'failure-sequence' && housePressure.failureComplete) {
      this.gameOverFadeElapsedMs = Math.min(
        GAME_OVER_FADE_DURATION_MS,
        (this.gameOverFadeElapsedMs ?? 0) + deltaSeconds * 1_000,
      );
      this.housePressureView.applyFailureFade(
        this.gameOverFadeElapsedMs / GAME_OVER_FADE_DURATION_MS,
      );

      if (this.gameOverFadeElapsedMs >= GAME_OVER_FADE_DURATION_MS) {
        this.housePressureView.holdFailureBlack();
        this.gameStateMachine.transitionTo('game-over');
      }
      return;
    }

    if (
      state !== 'blackout' &&
      state !== 'room-transition' &&
      state !== 'failure-sequence'
    ) {
      this.playerController.fixedUpdate(deltaSeconds);
    }

    if (state === 'observation') {
      const phase = this.runTimer.getSnapshot().phase;

      if (phase?.phase === 'observation' && phase.expired) {
        this.beginBlackout();
      }
    } else if (state === 'search') {
      const phase = this.runTimer.getSnapshot().phase;

      if (phase?.phase === 'search') {
        const erasureProgress = this.houseErasureSystem.applySearchCountdown(
          phase.remainingMs,
          phase.durationMs,
        );
        this.housePressureView.applyErasureWarning(erasureProgress);

        if (phase.expired) {
          this.registerRunError('timeout');
        }
      }
    } else if (state === 'room-complete') {
      this.exitDoorController.update(deltaSeconds);
      const door = this.exitDoorController.getSnapshot();

      if (
        door.state === 'open' &&
        !this.storyEffectRuntime.isRoomExitHeld() &&
        this.exitThresholdDetector.hasCrossed(
          this.playerController.getPosition(),
        )
      ) {
        if (
          this.canAdvanceToNextRoom()
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
      this.aimedStoryInteraction = null;
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
      storyInteractionLabel:
        this.aimedStoryInteraction?.actionLabel ?? null,
      errorCount: errorSnapshot.errorCount,
      maximumErrors: errorSnapshot.maximumErrors,
    });
    const touchActionLabel = this.gameStateMachine.currentState === 'search'
      ? 'REPORT'
      : this.gameStateMachine.currentState === 'room-complete'
        ? 'EXAMINE'
        : 'ACTION';
    this.touchInput.setActionContext(
      touchActionLabel,
      (this.gameStateMachine.currentState === 'search' &&
        this.aimedTargetId !== null) ||
        (this.gameStateMachine.currentState === 'room-complete' &&
          this.aimedStoryInteraction !== null),
    );
    this.roomCompleteBanner.update();
    if (!levelBuilderOpen) {
      this.debugRuntime?.update();
    }
  }

  private resetPlayer(): void {
    this.inputManager.reset();
    this.aimedTargetId = null;
    this.aimedStoryInteraction = null;
    this.lastSelectedTargetId = null;
    this.playerController.reset(this.room.getPlayerSpawn());
  }

  private applyHousePressure(snapshot: HousePressureSnapshot): void {
    const atmosphere = createAtmosphereProfile(snapshot);
    this.housePressureLighting.apply(snapshot);
    this.housePressureView.apply(snapshot);
    this.rendererManager.setAtmosphereProfile(
      atmosphere.stress,
      atmosphere.calmPulse,
    );
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
      'dining-room': diningRoomAnomalyCatalog,
      kitchen: kitchenAnomalyCatalog,
      'living-room': livingRoomAnomalyCatalog,
      'laundry-room': laundryRoomAnomalyCatalog,
      'entrance-corridor': entranceCorridorAnomalyCatalog,
      'main-hall': mainHallAnomalyCatalog,
      office: officeAnomalyCatalog,
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
    this.storyDirector.leaveRoom();
    this.roomCompleteBanner.reset();
    this.roomAudioDirector.finishRoom();
    this.housePressureLighting.release();
    this.blackoutView.begin(previousRoom.getVisualRoot(), this.scene);
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
    this.prepareAnomalyBaseline(runSeed);
    this.rendererManager.invalidateShadows();
  }

  private finishRoomTransition(): void {
    this.housePressureLighting.bind(this.room.getVisualRoot(), this.scene);
    this.applyHousePressure(this.housePressureSystem.getSnapshot());
    this.resetPlayer();
    this.blackoutView.reset();
    this.roomAudioDirector.startRoom();
    this.debugRuntime = this.createDebugRuntime();
    this.preloadNextBuiltRoom();
    this.storyDirector.enterRoom(this.room.definition.id);
    this.gameStateMachine.transitionTo('room-intro');

    if (this.isGameplayInputActive()) {
      this.gameStateMachine.transitionTo('observation');
      this.setGameplayActive(true);
    } else {
      this.showPointerLockPrompt(POINTER_LOCK_COPY.resume);
    }
  }

  private createRoom(roomIndex: number): PlayableRoom {
    if (roomIndex === 0) {
      return new GreyboxBedroom();
    }

    if (roomIndex === 1) {
      return new GreyboxBathroom();
    }

    if (roomIndex === 2) {
      return new GreyboxCorridor();
    }

    if (roomIndex === 3) {
      return new GreyboxOffice();
    }

    if (roomIndex === 4) {
      return new GreyboxKitchen();
    }

    if (roomIndex === 5) {
      return new GreyboxDiningRoom();
    }

    if (roomIndex === 6) {
      return new GreyboxLivingRoom();
    }

    if (roomIndex === 7) {
      return new GreyboxLaundryRoom();
    }

    if (roomIndex === 8) {
      return new GreyboxEntranceCorridor();
    }

    if (roomIndex === 9) {
      return new GreyboxMainHall();
    }

    throw new Error(`Room ${roomIndex + 1} has not been built yet.`);
  }

  private isRoomBuilt(roomIndex: number): boolean {
    return roomIndex >= 0 && roomIndex <= 9;
  }

  private canAdvanceToNextRoom(): boolean {
    if (
      this.runIdentity?.mode === 'story' &&
      isCurrentStoryRouteFinalRoom(this.roomProgression.currentStep.id)
    ) {
      return false;
    }

    return (
      this.roomProgression.hasNextRoom &&
      this.isRoomBuilt(this.roomProgression.currentStep.roomIndex + 1)
    );
  }

  private preloadNextBuiltRoom(): void {
    const nextRoomIndex =
      this.roomProgression.currentStep.roomIndex + 1;

    if (!this.canAdvanceToNextRoom()) {
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
      levelBuilderRooms: LEVEL_BUILDER_ROOMS,
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
      onLevelBuilderRoomChange: (roomIndex) =>
        this.switchLevelBuilderRoom(roomIndex),
    });
    runtime.setVisible(this.debugVisible);
    return runtime;
  }

  private switchLevelBuilderRoom(roomIndex: number): Promise<void> {
    if (roomIndex === this.roomProgression.currentStep.roomIndex) {
      return Promise.resolve();
    }

    if (!this.isRoomBuilt(roomIndex)) {
      return Promise.reject(
        new RangeError(`Room ${roomIndex + 1} has not been built yet.`),
      );
    }

    if (this.levelBuilderRoomChangePromise !== null) {
      return this.levelBuilderRoomChangePromise;
    }

    const change = this.performLevelBuilderRoomChange(roomIndex);
    this.levelBuilderRoomChangePromise = change;
    const clearPendingChange = (): void => {
      if (this.levelBuilderRoomChangePromise === change) {
        this.levelBuilderRoomChangePromise = null;
      }
    };
    void change.then(clearPendingChange, clearPendingChange);
    return change;
  }

  private async performLevelBuilderRoomChange(roomIndex: number): Promise<void> {
    const previousRoom = this.room;
    const nextRoom = this.createRoom(roomIndex);
    nextRoom.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });

    try {
      await nextRoom.loadAssets(this.assetManager);
    } catch (error: unknown) {
      nextRoom.unmount();
      throw error;
    }

    if (this.destroyed) {
      nextRoom.unmount();
      return;
    }

    this.roomPreloader.cancel();
    nextRoom.transferMount({
      scene: this.scene,
      worldCollision: this.worldCollision,
    });
    this.debugRuntime?.dispose();
    this.debugRuntime = null;
    this.targetReportHighlight.reset();
    this.anomalySystem.restore();
    this.housePressureLighting.release();
    previousRoom.unmount();
    this.room = nextRoom;
    const selectedStep = this.roomProgression.select(roomIndex);

    if (selectedStep.id !== nextRoom.definition.id) {
      throw new Error(
        `Escape-route room ${roomIndex + 1} does not match "${nextRoom.definition.id}".`,
      );
    }

    this.configureRoomGameplaySystems(nextRoom);
    this.registerActiveRoomCatalog();

    if (this.runIdentity !== null) {
      this.prepareActiveRoomBaseline(this.runIdentity.seed);
    }

    this.housePressureLighting.bind(nextRoom.getVisualRoot(), this.scene);
    this.applyHousePressure(this.housePressureSystem.getSnapshot());
    this.resetPlayer();
    this.rendererManager.invalidateShadows();

    if (this.experienceStarted) {
      this.storyDirector.leaveRoom();
      this.storyDirector.enterRoom(nextRoom.definition.id);
    }

    this.debugRuntime = this.createDebugRuntime();
    this.debugRuntime?.openLevelBuilder();
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
    if (
      this.gameStateMachine.currentState === 'blackout' ||
      this.gameStateMachine.currentState === 'failure-sequence'
    ) {
      this.aimedTargetId = null;
      this.aimedStoryInteraction = null;
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
    this.aimedStoryInteraction = this.resolveStoryInteraction(
      state,
      this.aimedTargetId,
    );
    this.targetReportHighlight.setAimedTarget(
      state === 'search' ? (target?.object ?? null) : null,
    );

    if (
      (state !== 'search' && state !== 'room-complete') ||
      !this.inputManager.wasActionPressed('interact') ||
      !this.isGameplayInputActive()
    ) {
      return;
    }

    if (this.aimedStoryInteraction !== null) {
      this.lastSelectedTargetId = this.aimedTargetId;
      this.storyDirector.emit({
        type: 'object-examined',
        objectId: this.aimedStoryInteraction.id,
      });

      if (
        state === 'room-complete' &&
        this.exitDoorController.getSnapshot().state === 'locked'
      ) {
        if (this.getPendingStoryExitRequirement() === null) {
          this.storyDirector.emit({ type: 'room-completed' });
        }

        this.tryUnlockRoomExit();
      }
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
      this.audioManager.play('house-calm');
      this.applyHousePressure(
        this.housePressureSystem.registerCorrectReport(),
      );
      this.storyDirector.emit({
        type: 'correct-report',
        targetId: target.id,
      });

      if (result.roomComplete) {
        this.gameStateMachine.transitionTo('room-complete');
      }
    } else if (result.outcome === 'incorrect') {
      this.registerRunError('incorrect-report');
    }
  }

  private resolveStoryInteraction(
    state: GameState,
    targetId: string | null,
  ): StoryInteractionDefinition | null {
    if (
      targetId === null ||
      this.runIdentity?.mode !== 'story' ||
      !this.storyDirector.getSnapshot().active ||
      state !== 'room-complete'
    ) {
      return null;
    }

    return this.storyInteractionRegistry.resolve(
      this.room.definition.id,
      targetId,
      state,
    );
  }

  private tryUnlockRoomExit(): boolean {
    const requirement = this.getPendingStoryExitRequirement();

    if (requirement !== null) {
      this.roomCompleteBanner.show({
        instruction:
          requirement.exitInstruction ?? 'COMPLETE THE MEMORY',
        persistent: true,
      });
      return false;
    }

    this.roomCompleteBanner.show();

    if (this.exitDoorController.unlock()) {
      this.roomAudioDirector.openExitDoor();
    }

    return true;
  }

  private getPendingStoryExitRequirement(): StoryInteractionDefinition | null {
    const mode = this.runIdentity?.mode;

    if (mode === undefined) {
      return null;
    }

    return this.storyExitGate.getPendingRequirement(
      mode,
      this.room.definition.id,
    );
  }

  private registerRunError(kind: RunErrorKind): void {
    const errorSnapshot = this.runErrorTracker.recordError(kind);
    this.storyDirector.setPressureLevel(errorSnapshot.errorCount);
    const pressureSnapshot = this.housePressureSystem.setPressureLevel(
      errorSnapshot.errorCount,
    );
    this.housePressureView.announcePressure(pressureSnapshot.pressureLevel);
    this.applyHousePressure(pressureSnapshot);
    this.storyDirector.emit({ type: 'run-error', kind });
    this.runTimer.addPenalty(
      kind === 'incorrect-report' ? 'incorrectReport' : 'timeout',
    );
    this.reportHud.showFeedback(
      kind === 'incorrect-report' ? 'incorrect' : 'timeout',
    );
    this.audioManager.play('report-incorrect');

    if (errorSnapshot.gameOver) {
      this.gameOverFadeElapsedMs = null;
      this.applyHousePressure(this.housePressureSystem.beginFailure());
      this.audioManager.play('house-takeover');
      this.gameStateMachine.transitionTo('failure-sequence');
      return;
    }

    this.audioManager.play(
      errorSnapshot.errorCount === 1
        ? 'house-pressure-1'
        : 'house-pressure-2',
    );

    if (kind === 'timeout') {
      this.houseErasureSystem.advanceTimeoutStage();
      this.housePressureView.resetErasureWarning();
      this.runTimer.startPhase(
        'search',
        this.roomProgression.currentStep.searchDurationMs,
      );
    }
  }

  private prepareNewRun(mode: GameMode): void {
    this.roomProgression.reset();

    if (this.room.definition.id !== this.roomProgression.currentStep.id) {
      throw new Error(
        `A new run must start in "${this.roomProgression.currentStep.id}", received "${this.room.definition.id}".`,
      );
    }

    this.roomAudioDirector.reset();
    this.blackoutTimeline.reset();
    this.blackoutView.reset();
    this.storyEffectRuntime.reset();
    this.houseErasureSystem.release();
    this.housePressureSystem.reset();
    this.housePressureView.reset();
    this.housePressureLighting.bind(this.room.getVisualRoot(), this.scene);
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
    this.rewardedReviveUsed = false;
    this.gameOverFadeElapsedMs = null;
    this.failedOutcomeRecordedForRun = false;
    const identityOptions =
      this.nextRunSeedOverride === null
        ? { mode }
        : { mode, seed: this.nextRunSeedOverride };
    this.runIdentity = createRunIdentity(identityOptions);
    this.storyDirector.beginLoop(mode, this.room.definition.id);
    this.prepareAnomalyBaseline(this.runIdentity.seed);
    this.preloadNextBuiltRoom();
    this.rendererManager.invalidateShadows();
    this.applyHousePressure(this.housePressureSystem.getSnapshot());
  }

  private async tryAgain(): Promise<void> {
    this.recordFailedStoryOutcome();
    await this.restartFinishedRun('game-over');
  }

  private async continueWithRewardedAd(): Promise<boolean> {
    const adapter = this.platformManager.activeAdapter;

    if (
      this.destroyed ||
      this.gameStateMachine.currentState !== 'game-over' ||
      this.rewardedReviveUsed ||
      !adapter.isRewardedAdAvailable()
    ) {
      return false;
    }

    const wasMuted = this.audioManager.getSnapshot().muted;
    let adMutedAudio = false;
    const restoreAudio = (): void => {
      if (!adMutedAudio) {
        return;
      }

      adMutedAudio = false;
      this.audioManager.setMuted(wasMuted);
      adapter.setAudioMuted(wasMuted);
    };
    let rewardGranted: boolean;

    try {
      rewardGranted = await adapter.requestRewardedAd({
        onStarted: () => {
          adMutedAudio = true;
          this.audioManager.setMuted(true);
          adapter.setAudioMuted(true);
        },
        onEnded: restoreAudio,
      });
    } finally {
      restoreAudio();
    }

    if (
      !rewardGranted ||
      this.destroyed ||
      this.gameStateMachine.currentState !== 'game-over'
    ) {
      return false;
    }

    this.rewardedReviveUsed = true;
    await this.reviveCurrentRoom();
    return true;
  }

  private async reviveCurrentRoom(): Promise<void> {
    const runIdentity = this.runIdentity;

    if (runIdentity === null || !this.runTimer.continueFinishedRun()) {
      throw new Error('A finished run is required for a rewarded revive.');
    }

    this.targetReportHighlight.reset();
    this.gameOverRevealTarget = null;
    this.anomalySystem.restore();
    this.reportHud.reset();
    this.roomCompleteBanner.reset();
    this.blackoutTimeline.reset();
    this.blackoutView.reset();
    this.storyEffectRuntime.reset();
    const errors = this.runErrorTracker.grantExtraLife();
    this.storyDirector.setPressureLevel(errors.errorCount);
    this.storyDirector.enterRoom(this.room.definition.id);
    const pressure = this.housePressureSystem.setPressureLevel(
      errors.errorCount,
    );
    this.housePressureView.reset();
    this.housePressureLighting.bind(this.room.getVisualRoot(), this.scene);
    this.applyHousePressure(pressure);
    const reviveSeed = deriveRoomSeed(
      runIdentity.seed,
      this.roomProgression.currentStep.roomIndex,
      `${this.room.definition.id}:rewarded-revive`,
    );
    this.prepareActiveRoomBaseline(reviveSeed);
    this.resetPlayer();
    this.rendererManager.resize();
    this.gameStateMachine.transitionTo('room-intro');
    this.setGameplayActive(true);
    await Promise.all([this.unlockAudio(), this.requestPointerLock()]);
  }

  private recordFailedStoryOutcome(): void {
    if (
      this.failedOutcomeRecordedForRun ||
      this.runIdentity?.mode !== 'story'
    ) {
      return;
    }

    this.failedOutcomeRecordedForRun = true;
    this.storyProgress.recordLoopOutcome('failed');
  }

  private async playAgain(): Promise<void> {
    await this.restartFinishedRun('victory');
  }

  private async returnToModeSelect(): Promise<void> {
    if (
      this.destroyed ||
      this.gameStateMachine.currentState !== 'victory'
    ) {
      return;
    }

    await this.ensureFirstRoomMounted();

    if (
      this.destroyed ||
      this.gameStateMachine.currentState !== 'victory'
    ) {
      return;
    }

    this.experienceStarted = false;
    this.gameStateMachine.transitionTo('main-menu');
    this.startScreen.show();
    this.startScreen.setBusy(false);
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

    const mode = this.runIdentity?.mode ?? 'escape';
    await this.ensureFirstRoomMounted();

    if (this.destroyed || this.gameStateMachine.currentState !== finishedState) {
      return;
    }

    this.prepareNewRun(mode);
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

  private prepareAnomalyBaseline(runSeed: number): void {
    const requiredVisibleTargetIds =
      this.getStoryRequiredVisibleTargetIds();
    const disappearanceProtectedTargetIds =
      this.getStoryDisappearanceProtectedTargetIds();
    this.anomalySystem.prepareRunBaseline({
      runSeed,
      roomIndex: this.roomProgression.currentStep.roomIndex,
      roomId: this.roomProgression.currentStep.id,
      ...(requiredVisibleTargetIds.length === 0
        ? {}
        : { requiredVisibleTargetIds }),
      ...(disappearanceProtectedTargetIds.length === 0
        ? {}
        : { disappearanceProtectedTargetIds }),
    });
  }

  private getStoryRequiredVisibleTargetIds(): readonly string[] {
    if (this.runIdentity?.mode !== 'story') {
      return [];
    }

    return this.room.getAnomalyTargets().map(({ id }) => id);
  }

  private getStoryDisappearanceProtectedTargetIds(): readonly string[] {
    if (this.runIdentity?.mode !== 'story') {
      return [];
    }

    const roomId = this.room.definition.id;
    const authoredTargetIds = STORY_DISAPPEARANCE_PROTECTED_TARGET_IDS_BY_ROOM[
      roomId as keyof typeof STORY_DISAPPEARANCE_PROTECTED_TARGET_IDS_BY_ROOM
    ] ?? [];
    const requiredTargetId = this.storyInteractionRegistry
      .getExitRequirement(roomId)?.targetId;

    return requiredTargetId === undefined
      ? authoredTargetIds
      : [...new Set([...authoredTargetIds, requiredTargetId])];
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
      this.resetPlayer();
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
    if (this.touchInput.isSupported) {
      this.hidePointerLockPrompt();
      this.resumeGameplayState();
      this.setGameplayActive(true);
      this.elements.canvas.focus({ preventScroll: true });
      return;
    }

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
    this.touchInput.setGameplayActive(active);

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

  private readonly handleTouchPause = (): void => {
    if (!this.touchInput.isActive) {
      return;
    }

    this.inputManager.reset();
    this.gameStateMachine.pause();
    this.setGameplayActive(false);
    this.showPointerLockPrompt(POINTER_LOCK_COPY.touchResume);
  };

  private readonly handleOpenNotebookFromMenu = (): void => {
    this.storyNotebookScreen.show(
      this.storyProgress.getPersistentSnapshot(),
      { allowErase: true },
    );
  };

  private readonly handleOpenNotebookFromPause = (): void => {
    this.storyNotebookScreen.show(
      this.storyProgress.getPersistentSnapshot(),
      { allowErase: false },
    );
  };

  private readonly handleSettingsChange = (settings: GameSettings): void => {
    this.settings = settings;
    this.applyAudioSettings(settings);
    this.playerController.setLookSensitivityMultiplier(
      settings.lookSensitivity,
    );
    this.settingsStore.save(settings);
  };

  private applyAudioSettings(settings: GameSettings): void {
    this.audioManager.setCategoryVolume('master', settings.masterVolume);
    this.audioManager.setCategoryVolume('music', settings.musicVolume);
    this.audioManager.setCategoryVolume('ambience', settings.ambienceVolume);
    this.audioManager.setCategoryVolume('effects', settings.effectsVolume);
    this.audioManager.setCategoryVolume('interface', settings.effectsVolume);
  }

  private readonly handleEraseStoryProgress = (): void => {
    const emptyProgress = createEmptyStoryProgress();
    this.storySaveRepository.eraseProgressPreservingAccess();
    this.storyProgress.hydrate(emptyProgress);
    this.storyNotebookScreen.refresh(emptyProgress);
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

  private isGameplayInputActive(): boolean {
    return this.desktopInput.isPointerLocked() || this.touchInput.isActive;
  }

  private readonly handleGameStateTransition = (
    transition: GameStateTransition,
  ): void => {
    if (transition.to === 'paused') {
      if (transition.from === 'blackout') {
        this.blackoutTimeline.pause();
      }

      this.storyDirector.pause();
      this.storyEffectRuntime.pause();
      this.housePressureSystem.pause();
      this.runTimer.pause();
      void this.audioManager.suspend().catch((error: unknown) => {
        console.warn('Audio could not be suspended cleanly.', error);
      });
      return;
    }

    if (transition.from === 'paused') {
      if (transition.to === 'main-menu') {
        this.storyDirector.stop();
        this.storyEffectRuntime.reset();
        this.housePressureSystem.reset();
        this.housePressureView.reset();
        this.housePressureLighting.release();
        this.runTimer.stop();
        this.runTimer.clearPhase();
      } else {
        this.storyDirector.resume();
        this.storyEffectRuntime.resume();
        this.housePressureSystem.resume();
        this.runTimer.resume();

        if (transition.to === 'blackout') {
          this.blackoutTimeline.resume();
        }
      }
      return;
    }

    switch (transition.to) {
      case 'room-intro':
        this.gameOverFadeElapsedMs = null;
        this.storyDirector.startPhase('room-intro');
        this.gameOverScreen.hide();
        this.victoryScreen.hide();
        break;
      case 'observation':
        this.houseErasureSystem.release();
        this.housePressureView.resetErasureWarning();
        this.storyDirector.startPhase('observation');
        if (!this.runTimer.hasStarted || this.runTimer.isFinished) {
          this.runTimer.startRun();
        }
        this.runTimer.startPhase(
          'observation',
          this.roomProgression.currentStep.observationDurationMs,
        );
        break;
      case 'blackout':
        this.storyDirector.startPhase('blackout');
        this.storyEffectRuntime.reset();
        this.runTimer.clearPhase();
        this.blackoutTimeline.start();
        this.blackoutView.begin(this.room.getVisualRoot(), this.scene);
        this.roomAudioDirector.beginBlackout();
        break;
      case 'room-complete':
        this.houseErasureSystem.release();
        this.housePressureView.resetErasureWarning();
        this.storyDirector.startPhase('room-complete');
        this.runTimer.clearPhase();

        if (this.getPendingStoryExitRequirement() === null) {
          this.storyDirector.emit({ type: 'room-completed' });
        }

        this.tryUnlockRoomExit();
        break;
      case 'search': {
        this.storyDirector.startPhase('search');
        const activePlan = this.anomalySystem.getActivePlan();

        if (activePlan === null) {
          throw new Error(
            'A room anomaly plan is required before reporting can start.',
          );
        }

        this.reportSystem.startRound(activePlan);
        this.blackoutTimeline.reset();
        this.blackoutView.reset();
        this.runTimer.startPhase(
          'search',
          this.roomProgression.currentStep.searchDurationMs,
        );
        this.houseErasureSystem.beginSearch(
          this.room.getVisualRoot(),
          this.room.getAnomalyTargets(),
          activePlan.anomalies.map(({ targetId }) => targetId),
        );
        break;
      }
      case 'failure-sequence':
        this.housePressureView.resetErasureWarning();
        this.runTimer.clearPhase();
        this.runTimer.stop();
        this.reportHud.reset();
        this.targetReportHighlight.reset();
        this.setGameplayActive(false);
        break;
      case 'game-over': {
        this.houseErasureSystem.release();
        this.housePressureSystem.reset();
        this.housePressureView.holdFailureBlack();
        this.housePressureLighting.release();
        this.storyDirector.emit({ type: 'loop-failed' });

        this.storyEffectRuntime.reset();
        this.roomCompleteBanner.reset();
        this.runTimer.clearPhase();
        this.runTimer.stop();
        const errors = this.runErrorTracker.getSnapshot();
        const activePlan = this.anomalySystem.getActivePlan();
        const missedAnomaly = describeMissedAnomalyForMode(
          this.runIdentity?.mode ?? 'story',
          activePlan,
        );
        this.gameOverRevealTarget = null;
        this.targetReportHighlight.reset();
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
          rewardedContinueAvailable:
            !this.rewardedReviveUsed &&
            this.platformManager.activeAdapter.isRewardedAdAvailable(),
        });
        this.roomAudioDirector.finishRoom();
        this.setGameplayActive(false);
        this.desktopInput.releasePointerLock();
        break;
      }
      case 'victory': {
        this.houseErasureSystem.release();
        this.housePressureSystem.reset();
        this.housePressureView.reset();
        this.housePressureLighting.release();
        this.storyDirector.emit({ type: 'chapter-completed' });
        this.storyEffectRuntime.reset();

        let storyOutcome: StoryChapterOutcome | undefined;

        if (this.runIdentity?.mode === 'story') {
          const firstChapterOutcome = resolveFirstChapterOutcome(
            this.storyProgress.getSnapshot().fragments,
          );
          const endings = this.storyProgress.getSnapshot().endingIds;
          const finalEnding = endings.includes('replaced')
            ? 'ending-replaced'
            : endings.includes('remember')
              ? 'ending-remember'
              : endings.includes('escape')
                ? 'ending-escape'
                : undefined;
          storyOutcome = this.room.definition.id === 'main-hall' && finalEnding !== undefined
            ? finalEnding
            : this.room.definition.id === 'laundry-room'
              ? 'chapter-two-copies'
            : this.room.definition.id === 'living-room'
              ? 'chapter-two-recording'
              : firstChapterOutcome;
          this.storyProgress.recordLoopOutcome('completed');
          this.storyProgress.addChapterOutcome('chapter-one-complete');
          this.storyProgress.addChapterOutcome(firstChapterOutcome);
          this.storyProgress.addChapterOutcome(storyOutcome);
          this.storySaveRepository.unlockEscape();
          this.startScreen.setEscapeUnlocked(true);
        }

        this.roomCompleteBanner.reset();
        this.runTimer.clearPhase();
        this.runTimer.stop();
        const errors = this.runErrorTracker.getSnapshot();
        const timing = this.runTimer.getSnapshot();
        this.victoryScreen.show({
          timing,
          errorCount: errors.errorCount,
          maximumErrors: errors.maximumErrors,
          ...(storyOutcome === undefined ? {} : { storyOutcome }),
        });
        this.roomAudioDirector.finishRoom();
        this.setGameplayActive(false);
        this.desktopInput.releasePointerLock();

        if (this.runIdentity?.mode === 'escape') {
          void this.platformManager.activeAdapter
            .submitEscapeTime(timing.finalTimeMs)
            .catch((error: unknown) => {
              console.warn('Escape time could not be submitted.', error);
            });
        }
        break;
      }
      case 'main-menu':
        this.houseErasureSystem.release();
        this.storyDirector.stop();
        this.storyEffectRuntime.reset();
        this.rendererManager.setAtmosphereProfile(0, 0);
        this.housePressureSystem.reset();
        this.housePressureView.reset();
        this.housePressureLighting.release();
        this.storyIntroScreen.hide();
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

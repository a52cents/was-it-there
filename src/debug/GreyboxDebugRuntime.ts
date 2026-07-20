import * as THREE from 'three';
import type { GameLoop } from '../app/GameLoop';
import type { GameState } from '../app/GameStateMachine';
import type { RunTimerSnapshot } from '../app/RunTimer';
import type { AudioManagerSnapshot } from '../audio/AudioManager';
import type { AnomalyPlan } from '../gameplay/anomalies/AnomalyGenerator';
import type { BlackoutSnapshot } from '../gameplay/anomalies/BlackoutTimeline';
import type { RoomAnomalySystem } from '../gameplay/anomalies/RoomAnomalySystem';
import type { RoomReportSnapshot } from '../gameplay/interaction/RoomReportSystem';
import type { ExitDoorSnapshot } from '../gameplay/progression/ExitDoorController';
import type { RunErrorSnapshot } from '../gameplay/run/RunErrorTracker';
import type { RunIdentity } from '../gameplay/run/RunIdentity';
import type { DesktopInput } from '../input/DesktopInput';
import type { InputManager } from '../input/InputManager';
import { PLAYER_CONFIG } from '../player/PlayerConfig';
import type { PlayerController } from '../player/PlayerController';
import { RENDER_LAYERS } from '../rendering/RenderLayers';
import type { RendererManager } from '../rendering/RendererManager';
import { InputDebugPanel } from '../ui/InputDebugPanel';
import type { PlayableRoom } from '../world/rooms/PlayableRoom';
import type { WorldCollision } from '../world/WorldCollision';
import type { DebugSnapshot } from './DebugSnapshot';
import { LevelBuilderRuntime } from './level-builder/LevelBuilderRuntime';
import type { LevelBuilderRoomOption } from './level-builder/LevelBuilderPanel';

type CapsuleDebugMesh = THREE.LineLoop<
  THREE.BufferGeometry,
  THREE.LineBasicMaterial
>;

export interface GreyboxDebugRuntimeOptions {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly canvas: HTMLCanvasElement;
  readonly hudLayer: HTMLElement;
  readonly inputManager: InputManager;
  readonly desktopInput: DesktopInput;
  readonly playerController: PlayerController;
  readonly rendererManager: RendererManager;
  readonly gameLoop: GameLoop;
  readonly worldCollision: WorldCollision;
  readonly room: PlayableRoom;
  readonly levelBuilderRooms: readonly LevelBuilderRoomOption[];
  readonly anomalySystem: RoomAnomalySystem;
  readonly isGameActive: () => boolean;
  readonly getGameState: () => GameState;
  readonly getTimingSnapshot: () => RunTimerSnapshot;
  readonly getAudioSnapshot: () => AudioManagerSnapshot;
  readonly getAimedTargetId: () => string | null;
  readonly getLastSelectedTargetId: () => string | null;
  readonly getReportSnapshot: () => RoomReportSnapshot;
  readonly getRunErrorSnapshot: () => RunErrorSnapshot;
  readonly getExitDoorSnapshot: () => ExitDoorSnapshot;
  readonly getRunIdentity: () => RunIdentity | null;
  readonly getPendingAnomalyPlan: () => AnomalyPlan | null;
  readonly getBlackoutSnapshot: () => BlackoutSnapshot;
  readonly isAnomalyAppliedDuringBlackout: () => boolean;
  readonly setEffectsVolume: (volume: number) => void;
  readonly setMusicVolume: (volume: number) => void;
  readonly setNextRunSeed: (seed: number) => void;
  readonly onLevelBuilderOpen: () => void;
  readonly onLevelBuilderRoomChange: (roomIndex: number) => Promise<void>;
}

export class GreyboxDebugRuntime {
  private readonly capsuleDebugMesh: CapsuleDebugMesh;
  private readonly panel: InputDebugPanel;
  private readonly levelBuilder: LevelBuilderRuntime;
  private anomalyError: string | null = null;
  private visible = true;
  private collisionVisibleBeforeHide = false;
  private interactionVisibleBeforeHide = false;

  public constructor(private readonly options: GreyboxDebugRuntimeOptions) {
    options.camera.layers.enable(RENDER_LAYERS.debug);
    options.camera.layers.disable(RENDER_LAYERS.interaction);
    this.capsuleDebugMesh = this.createCapsuleDebugMesh();
    options.scene.add(this.capsuleDebugMesh);
    this.levelBuilder = new LevelBuilderRuntime({
      scene: options.scene,
      camera: options.camera,
      canvas: options.canvas,
      panelRoot: options.hudLayer,
      roomId: options.room.definition.id,
      roomRoot: options.room.getVisualRoot(),
      rooms: options.levelBuilderRooms,
      anomalyTargets: options.room.getAnomalyTargetRegistry(),
      gameLoop: options.gameLoop,
      onOpen: () => {
        options.onLevelBuilderOpen();
        options.inputManager.reset();
        options.anomalySystem.restore();
        options.rendererManager.invalidateShadows();
        options.desktopInput.releasePointerLock();
      },
      onClose: () => {
        const state = options.getGameState();

        if (
          state !== 'main-menu' &&
          state !== 'game-over' &&
          state !== 'victory'
        ) {
          void options.desktopInput.requestPointerLock().catch(
            (error: unknown) => {
              console.warn(
                'Pointer lock could not resume after Level Builder.',
                error,
              );
            },
          );
        }
      },
      onRoomChange: options.onLevelBuilderRoomChange,
      onObjectChanged: () => options.rendererManager.invalidateShadows(),
    });
    this.panel = new InputDebugPanel(options.hudLayer, options.camera, {
      getSnapshot: () => this.createSnapshot(),
      getObservationTargets: () => options.room.getAnomalyTargets(),
      onReset: () => this.resetPlayer(),
      onRemountRoom: () => {
        void this.remountRoom();
      },
      onApplyAnomalySeed: (seed) => this.applyAnomalySeed(seed),
      onRestoreAnomalies: () => this.restoreAnomalies(),
      onOpenLevelBuilder: () => this.levelBuilder.open(),
      isCollisionGeometryVisible: () => options.room.isCollisionVisible(),
      setCollisionGeometryVisible: (visible) =>
        options.room.setCollisionVisible(visible),
      isCapsuleVisible: () => this.capsuleDebugMesh.visible,
      setCapsuleVisible: (visible) => {
        this.capsuleDebugMesh.visible = visible;
      },
      areInteractionVolumesVisible: () =>
        options.camera.layers.isEnabled(RENDER_LAYERS.interaction),
      setInteractionVolumesVisible: (visible) => {
        if (visible) {
          options.camera.layers.enable(RENDER_LAYERS.interaction);
        } else {
          options.camera.layers.disable(RENDER_LAYERS.interaction);
        }
      },
      setEffectsVolume: options.setEffectsVolume,
      setMusicVolume: options.setMusicVolume,
    });
  }

  public update(): void {
    const capsule = this.options.playerController.getCapsule();
    this.capsuleDebugMesh.position.set(
      capsule.start.x,
      capsule.start.y - capsule.radius + 0.01,
      capsule.start.z,
    );
    this.panel.update();
    this.levelBuilder.update();
  }

  public isLevelBuilderOpen(): boolean {
    return this.levelBuilder.isOpen();
  }

  public openLevelBuilder(): void {
    this.levelBuilder.open();
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public setVisible(visible: boolean): void {
    if (visible === this.visible) {
      return;
    }

    this.visible = visible;

    if (!visible) {
      this.collisionVisibleBeforeHide =
        this.options.room.isCollisionVisible();
      this.interactionVisibleBeforeHide =
        this.options.camera.layers.isEnabled(RENDER_LAYERS.interaction);
      this.options.room.setCollisionVisible(false);
      this.options.camera.layers.disable(RENDER_LAYERS.debug);
      this.options.camera.layers.disable(RENDER_LAYERS.interaction);
      this.panel.setVisible(false);
      return;
    }

    this.options.camera.layers.enable(RENDER_LAYERS.debug);

    if (this.interactionVisibleBeforeHide) {
      this.options.camera.layers.enable(RENDER_LAYERS.interaction);
    }

    this.options.room.setCollisionVisible(this.collisionVisibleBeforeHide);
    this.panel.setVisible(true);
  }

  public dispose(): void {
    this.levelBuilder.dispose();
    this.panel.dispose();
    this.options.scene.remove(this.capsuleDebugMesh);
    this.options.camera.layers.disable(RENDER_LAYERS.interaction);
    this.options.camera.layers.disable(RENDER_LAYERS.debug);
    this.capsuleDebugMesh.geometry.dispose();
    this.capsuleDebugMesh.material.dispose();
  }

  private createCapsuleDebugMesh(): CapsuleDebugMesh {
    const points: THREE.Vector3[] = [];
    for (let segment = 0; segment < 32; segment += 1) {
      const angle = (segment / 32) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * PLAYER_CONFIG.capsuleRadius,
          0,
          Math.sin(angle) * PLAYER_CONFIG.capsuleRadius,
        ),
      );
    }

    const helper = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: 0xd9665b,
        depthTest: false,
      }),
    );
    helper.name = 'DEBUG_PlayerCapsuleFootprint';
    helper.layers.set(RENDER_LAYERS.debug);
    helper.renderOrder = 10;
    helper.visible = false;
    return helper;
  }

  private resetPlayer(): void {
    this.options.inputManager.reset();
    this.options.playerController.reset(this.options.room.getPlayerSpawn());
  }

  private async remountRoom(): Promise<void> {
    const showCollisions = this.options.room.isCollisionVisible();
    this.options.inputManager.reset();
    this.options.anomalySystem.restore();

    try {
      this.options.room.unmount();
      this.options.room.mount({
        scene: this.options.scene,
        worldCollision: this.options.worldCollision,
      });
      await this.options.room.loadAssets();
      this.options.room.setCollisionVisible(showCollisions);
      this.options.playerController.reset(this.options.room.getPlayerSpawn());
      this.options.rendererManager.invalidateShadows();
      this.anomalyError = null;
    } catch (error: unknown) {
      this.anomalyError =
        error instanceof Error ? error.message : String(error);
      console.error('[Room debug] Remount failed.', error);
    }
  }

  private applyAnomalySeed(seed: number): void {
    try {
      this.options.anomalySystem.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: this.options.room.definition.id,
      });
      const plan = this.options.anomalySystem.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: this.options.room.definition.id,
        difficulty: 1,
        count: this.options.room.definition.anomalyCount.min,
      });
      this.options.anomalySystem.applyPlan(plan);
      this.options.rendererManager.invalidateShadows();
      this.options.setNextRunSeed(plan.runSeed);
      this.anomalyError = null;
      console.info(
        `[Anomaly debug] run seed ${plan.runSeed}, room seed ${plan.roomSeed}:`,
        plan.anomalies,
      );
    } catch (error: unknown) {
      this.anomalyError =
        error instanceof Error ? error.message : String(error);
      console.error('[Anomaly debug] Generation failed.', error);
    }
  }

  private restoreAnomalies(): void {
    this.options.anomalySystem.restore();
    this.options.rendererManager.invalidateShadows();
    this.anomalyError = null;
  }

  private createSnapshot(): DebugSnapshot {
    const frameDeltaSeconds =
      this.options.gameLoop.frameDeltaSecondsLastFrame;
    const position = this.options.playerController.getPosition();
    const velocity = this.options.playerController.getCurrentVelocity();
    const capsule = this.options.playerController.getCapsule();
    const rendering = this.options.rendererManager.getStats();

    return {
      app: {
        gameState: this.options.getGameState(),
        gameActive: this.options.isGameActive(),
        pointerLocked: this.options.desktopInput.isPointerLocked(),
      },
      audio: this.options.getAudioSnapshot(),
      room: {
        id: this.options.room.definition.id,
        visualObjectCount: this.options.room.getVisualObjectCount(),
        collisionObjectCount: this.options.room.getCollisionObjectCount(),
        observationTargetCount:
          this.options.room.getAnomalyTargets().length,
        exitDoorFound: this.options.room.getExitDoor() !== null,
      },
      interaction: {
        aimedTargetId: this.options.getAimedTargetId(),
        lastSelectedTargetId: this.options.getLastSelectedTargetId(),
      },
      reporting: this.options.getReportSnapshot(),
      errors: this.options.getRunErrorSnapshot(),
      progression: {
        exitDoor: this.options.getExitDoorSnapshot(),
      },
      anomaly: {
        runIdentity: this.options.getRunIdentity(),
        pendingPlan: this.options.getPendingAnomalyPlan(),
        activePlan: this.options.anomalySystem.getActivePlan(),
        baseline: this.options.anomalySystem.getBaselineSnapshot(),
        blackout: this.options.getBlackoutSnapshot(),
        appliedDuringBlackout:
          this.options.isAnomalyAppliedDuringBlackout(),
        error: this.anomalyError,
      },
      player: {
        position: { x: position.x, y: position.y, z: position.z },
        yaw: this.options.playerController.getYaw(),
        pitch: this.options.playerController.getPitch(),
        horizontalSpeed: Math.hypot(velocity.x, velocity.z),
        verticalVelocity:
          this.options.playerController.getVerticalVelocity(),
        grounded: this.options.playerController.isGrounded(),
      },
      capsule: {
        radius: capsule.radius,
        start: {
          x: capsule.start.x,
          y: capsule.start.y,
          z: capsule.start.z,
        },
        end: {
          x: capsule.end.x,
          y: capsule.end.y,
          z: capsule.end.z,
        },
      },
      physics: {
        fixedSteps: this.options.gameLoop.fixedStepsLastFrame,
        worldColliderReady: this.options.worldCollision.isReady(),
      },
      rendering: {
        fps: frameDeltaSeconds > 0 ? 1 / frameDeltaSeconds : 0,
        frameDeltaSeconds,
        drawCalls: rendering.drawCalls,
        triangles: rendering.triangles,
      },
      timing: this.options.getTimingSnapshot(),
    };
  }
}

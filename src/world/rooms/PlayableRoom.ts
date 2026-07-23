import type * as THREE from 'three';
import type { AnomalyTarget } from '../../gameplay/anomalies/AnomalyTarget';
import type { AnomalyTargetRegistry } from '../../gameplay/anomalies/AnomalyTargetRegistry';
import type { ExitThresholdDefinition } from '../../gameplay/progression/ExitThresholdDetector';
import type { PlayerSpawn } from '../../player/PlayerConfig';
import type { AssetManager } from '../assets/AssetManager';
import type { RoomDefinition } from '../RoomDefinition';
import type {
  RoomCleanupYield,
  RoomRuntimeOptions,
} from '../RoomRuntime';

export interface PlayableRoom {
  readonly definition: RoomDefinition;

  mount(options: RoomRuntimeOptions): void;
  transferMount(options: RoomRuntimeOptions): void;
  unmount(): void;
  unmountIncrementally(
    yieldBetweenBatches: RoomCleanupYield,
    batchSize?: number,
  ): Promise<void>;
  isMounted(): boolean;
  getVisualRoot(): THREE.Group;
  getCollisionRoot(): THREE.Group;
  getPlayerSpawn(): PlayerSpawn;
  getVisualObjectCount(): number;
  getCollisionObjectCount(): number;
  setCollisionVisible(visible: boolean): void;
  isCollisionVisible(): boolean;
  getAnomalyTargets(): readonly AnomalyTarget[];
  getAnomalyTargetRegistry(): AnomalyTargetRegistry;
  loadAssets(assetManager?: AssetManager): Promise<void>;
  getExitDoor(): THREE.Object3D | null;
  setExitDoorCollisionEnabled(
    enabled: boolean,
    rebuildCollision?: boolean,
  ): void;
  setExitPortalProgress(progress: number): void;
  getExitThresholdDefinition(): ExitThresholdDefinition;
}

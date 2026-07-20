import * as THREE from 'three';

export interface HouseErasureTarget {
  readonly id: string;
  readonly object: THREE.Object3D;
}

interface VisibilityEntry {
  readonly object: THREE.Object3D;
  readonly visible: boolean;
}

const SEARCH_WARNING_START_RATIO = 0.28;
const SEARCH_TIMEOUT_STAGES = 3;

/**
 * Drives the cheap, deterministic "house erasure" effect without touching
 * transforms or materials used by authored anomalies.
 */
export class HouseErasureSystem {
  private secondaryObjects: VisibilityEntry[] = [];
  private activeAnomalies: VisibilityEntry[] = [];
  private structure: VisibilityEntry[] = [];
  private allEntries: VisibilityEntry[] = [];
  private timeoutStage = 0;

  public beginSearch(
    visualRoot: THREE.Object3D,
    targets: readonly HouseErasureTarget[],
    activeTargetIds: readonly string[],
  ): void {
    this.release();

    const activeIds = new Set(activeTargetIds);
    const targetRoots = new Set(targets.map(({ object }) => object));
    const detailRoots = collectDetailRoots(visualRoot, targetRoots);
    const captured = new Set<THREE.Object3D>();
    const capture = (object: THREE.Object3D): VisibilityEntry => {
      const entry = { object, visible: object.visible };
      captured.add(object);
      this.allEntries.push(entry);
      return entry;
    };

    for (const target of targets) {
      const entry = capture(target.object);

      if (activeIds.has(target.id)) {
        this.activeAnomalies.push(entry);
      } else {
        this.secondaryObjects.push(entry);
      }
    }

    for (const detailRoot of detailRoots) {
      if (!captured.has(detailRoot)) {
        this.secondaryObjects.push(capture(detailRoot));
      }
    }

    visualRoot.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (
        !mesh.isMesh ||
        captured.has(mesh) ||
        isInsideAny(mesh, targetRoots) ||
        isInsideAny(mesh, detailRoots) ||
        isRuntimeHelper(mesh)
      ) {
        return;
      }

      this.structure.push(capture(mesh));
    });
  }

  public applySearchCountdown(remainingMs: number, durationMs: number): number {
    if (
      !Number.isFinite(remainingMs) ||
      !Number.isFinite(durationMs) ||
      durationMs <= 0
    ) {
      return 0;
    }

    const remainingRatio = THREE.MathUtils.clamp(
      remainingMs / durationMs,
      0,
      1,
    );
    const progress = THREE.MathUtils.clamp(
      (SEARCH_WARNING_START_RATIO - remainingRatio) /
        SEARCH_WARNING_START_RATIO,
      0,
      1,
    );
    const erasedCount = Math.ceil(
      this.secondaryObjects.length *
        Math.min(
          1,
          (this.timeoutStage + smoothStep(progress)) /
            SEARCH_TIMEOUT_STAGES,
        ),
    );

    applyVisibleCount(this.secondaryObjects, erasedCount);
    return progress;
  }

  public advanceTimeoutStage(): void {
    this.timeoutStage = Math.min(
      SEARCH_TIMEOUT_STAGES - 1,
      this.timeoutStage + 1,
    );
  }

  public applyFailure(progress: number): void {
    const normalized = THREE.MathUtils.clamp(progress, 0, 1);
    const secondaryProgress = remap(normalized, 0, 0.38);
    const structureProgress = remap(normalized, 0.2, 0.82);
    const anomalyProgress = remap(normalized, 0.62, 0.94);

    applyVisibleCount(
      this.secondaryObjects,
      Math.ceil(this.secondaryObjects.length * secondaryProgress),
    );
    applyVisibleCount(
      this.structure,
      Math.ceil(this.structure.length * structureProgress),
    );
    applyVisibleCount(
      this.activeAnomalies,
      Math.ceil(this.activeAnomalies.length * anomalyProgress),
    );
  }

  public restoreSearch(): void {
    for (const entry of this.secondaryObjects) {
      entry.object.visible = entry.visible;
    }
  }

  public release(): void {
    for (const entry of this.allEntries) {
      entry.object.visible = entry.visible;
    }

    this.secondaryObjects = [];
    this.activeAnomalies = [];
    this.structure = [];
    this.allEntries = [];
    this.timeoutStage = 0;
  }
}

function collectDetailRoots(
  root: THREE.Object3D,
  targetRoots: ReadonlySet<THREE.Object3D>,
): Set<THREE.Object3D> {
  const details = new Set<THREE.Object3D>();

  root.traverse((object) => {
    if (
      object.name.startsWith('DETAIL_') &&
      !isInsideAny(object, targetRoots) &&
      !isInsideAny(object, details)
    ) {
      details.add(object);
    }
  });

  return details;
}

function isInsideAny(
  object: THREE.Object3D,
  roots: ReadonlySet<THREE.Object3D>,
): boolean {
  let cursor: THREE.Object3D | null = object;

  while (cursor !== null) {
    if (roots.has(cursor)) {
      return true;
    }

    cursor = cursor.parent;
  }

  return false;
}

function isRuntimeHelper(object: THREE.Object3D): boolean {
  return (
    object.name.startsWith('INTERACT_') ||
    object.name.startsWith('DEBUG_') ||
    object.name.startsWith('EXIT_')
  );
}

function applyVisibleCount(
  entries: readonly VisibilityEntry[],
  erasedCount: number,
): void {
  const normalizedCount = Math.max(0, Math.min(entries.length, erasedCount));

  entries.forEach((entry, index) => {
    entry.object.visible = index >= normalizedCount && entry.visible;
  });
}

function remap(value: number, start: number, end: number): number {
  return smoothStep(THREE.MathUtils.clamp((value - start) / (end - start), 0, 1));
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

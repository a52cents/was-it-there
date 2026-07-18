import * as THREE from 'three';
import {
  deriveRoomSeed,
  normalizeSeed,
  SeededRandom,
} from '../../core/random/SeededRandom';
import type {
  AnomalyNodePathSegment,
  AnomalyTarget,
  PreparedAnomalyVariant,
} from './AnomalyTarget';

export type ImplementedAnomalyKind = PreparedAnomalyVariant['kind'];

export interface PlannedAnomaly {
  readonly targetId: string;
  readonly kind: ImplementedAnomalyKind;
  readonly variantId: string;
}

export interface AnomalyPlan {
  readonly runSeed: number;
  readonly roomSeed: number;
  readonly roomId: string;
  readonly roomIndex: number;
  readonly difficulty: number;
  readonly anomalies: readonly PlannedAnomaly[];
}

export interface GenerateAnomalyPlanOptions {
  readonly runSeed: number;
  readonly roomIndex: number;
  readonly roomId: string;
  readonly difficulty: number;
  readonly count: number;
  readonly targets: readonly AnomalyTarget[];
}

interface EligibleTarget {
  readonly target: AnomalyTarget;
  readonly variants: readonly PreparedAnomalyVariant[];
}

export function generateAnomalyPlan(
  options: GenerateAnomalyPlanOptions,
): AnomalyPlan {
  validateGenerationOptions(options);
  const runSeed = normalizeSeed(options.runSeed);
  const roomSeed = deriveRoomSeed(
    runSeed,
    options.roomIndex,
    options.roomId,
  );
  const random = new SeededRandom(roomSeed);
  const candidates = options.targets
    .filter((target) => target.minimumDifficulty <= options.difficulty)
    .map((target) => ({
      target,
      variants: validateAndGetVariants(target, options.roomId, roomSeed),
    }));

  if (options.count > candidates.length) {
    throw new Error(
      `Room "${options.roomId}" cannot generate ${options.count} anomalies from ${candidates.length} eligible targets (seed ${roomSeed}).`,
    );
  }

  const anomalies: PlannedAnomaly[] = [];

  while (anomalies.length < options.count) {
    const targetIndex = pickWeightedTargetIndex(candidates, random);
    const [candidate] = candidates.splice(targetIndex, 1);

    if (candidate === undefined) {
      throw new Error(
        `Room "${options.roomId}" exhausted anomaly targets unexpectedly (seed ${roomSeed}).`,
      );
    }

    const variant =
      candidate.variants[random.nextInteger(candidate.variants.length)];

    if (variant === undefined) {
      throw new Error(
        `Target "${candidate.target.id}" has no selectable anomaly variant (seed ${roomSeed}).`,
      );
    }

    anomalies.push({
      targetId: candidate.target.id,
      kind: variant.kind,
      variantId: variant.id,
    });
  }

  return {
    runSeed,
    roomSeed,
    roomId: options.roomId,
    roomIndex: options.roomIndex,
    difficulty: options.difficulty,
    anomalies,
  };
}

function validateGenerationOptions(options: GenerateAnomalyPlanOptions): void {
  if (!Number.isInteger(options.count) || options.count < 0) {
    throw new Error(
      `Anomaly count must be a non-negative integer; received ${options.count}.`,
    );
  }

  if (!Number.isInteger(options.difficulty) || options.difficulty < 1) {
    throw new Error(
      `Difficulty must be a positive integer; received ${options.difficulty}.`,
    );
  }
}

function validateAndGetVariants(
  target: AnomalyTarget,
  roomId: string,
  roomSeed: number,
): readonly PreparedAnomalyVariant[] {
  if (!Number.isFinite(target.weight) || target.weight <= 0) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `weight must be positive; received ${target.weight}`,
    );
  }

  const variantIds = new Set<string>();

  for (const variant of target.variants) {
    if (variant.id.length === 0 || variantIds.has(variant.id)) {
      throw targetConfigurationError(
        roomId,
        target.id,
        roomSeed,
        `variant id "${variant.id}" is empty or duplicated`,
      );
    }

    variantIds.add(variant.id);

    if (!target.allowedKinds.includes(variant.kind)) {
      throw targetConfigurationError(
        roomId,
        target.id,
        roomSeed,
        `variant "${variant.id}" uses disallowed kind "${variant.kind}"`,
      );
    }

    validateVariant(target, variant, roomId, roomSeed);
  }

  const selectableVariants = target.variants.filter(
    (variant) => variant.kind !== 'show' || canShowTarget(target),
  );

  if (selectableVariants.length === 0) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      'at least one currently applicable prepared variant is required',
    );
  }

  return selectableVariants;
}

function canShowTarget(target: AnomalyTarget): boolean {
  return target.initialState.nodes.some((snapshot) => {
    const mesh = snapshot.node as THREE.Mesh;
    return mesh.isMesh && snapshot.visible && !mesh.visible;
  });
}

function validateVariant(
  target: AnomalyTarget,
  variant: PreparedAnomalyVariant,
  roomId: string,
  roomSeed: number,
): void {
  switch (variant.kind) {
    case 'hide': {
      const hasVisibleMesh = target.initialState.nodes.some((snapshot) => {
        const mesh = snapshot.node as THREE.Mesh;
        return mesh.isMesh && snapshot.visible;
      });

      if (!hasVisibleMesh) {
        throw targetConfigurationError(
          roomId,
          target.id,
          roomSeed,
          `hide variant "${variant.id}" has no visible mesh to hide`,
        );
      }
      break;
    }
    case 'show':
      break;
    case 'move': {
      const values = variant.positionOffset;

      if (
        !values.every(Number.isFinite) ||
        values.every((value) => Math.abs(value) < Number.EPSILON)
      ) {
        throw targetConfigurationError(
          roomId,
          target.id,
          roomSeed,
          `move variant "${variant.id}" must contain a finite, non-zero offset`,
        );
      }
      break;
    }
    case 'rotate': {
      const values = variant.rotationOffsetRadians;

      if (
        !values.every(Number.isFinite) ||
        values.every((value) => Math.abs(value) < Number.EPSILON)
      ) {
        throw targetConfigurationError(
          roomId,
          target.id,
          roomSeed,
          `rotation variant "${variant.id}" must contain a finite, non-zero offset`,
        );
      }
      break;
    }
    case 'scale': {
      const values = variant.scaleMultiplier;

      if (
        !values.every(Number.isFinite) ||
        values.some((value) => Math.abs(value) < Number.EPSILON) ||
        values.every((value) => Math.abs(value - 1) < Number.EPSILON)
      ) {
        throw targetConfigurationError(
          roomId,
          target.id,
          roomSeed,
          `scale variant "${variant.id}" must contain finite, non-zero multipliers and change at least one axis`,
        );
      }
      break;
    }
    case 'color':
      validateColorVariant(target, variant, roomId, roomSeed);
      break;
  }
}

function validateColorVariant(
  target: AnomalyTarget,
  variant: Extract<PreparedAnomalyVariant, { kind: 'color' }>,
  roomId: string,
  roomSeed: number,
): void {
  if (variant.restoresCanonicalColors === true) {
    validateCanonicalColorRestore(target, variant, roomId, roomSeed);
    return;
  }

  if (variant.materialColorChanges !== undefined) {
    validateMaterialColorChanges(target, variant, roomId, roomSeed);
    return;
  }

  if (!/^#[\da-f]{6}$/iu.test(variant.color)) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" must use a six-digit hexadecimal color`,
    );
  }

  if (variant.nodeNames.length === 0) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" requires at least one node`,
    );
  }

  if (variant.materialNames?.length === 0) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" cannot use an empty material filter`,
    );
  }

  const color = new THREE.Color(variant.color);
  const requestedMaterialNames =
    variant.materialNames === undefined
      ? null
      : new Set(variant.materialNames);
  const foundMaterialNames = new Set<string>();
  let hasColorMaterial = false;
  let changesColor = false;

  for (const nodeName of new Set(variant.nodeNames)) {
    const node = target.object.getObjectByName(nodeName) as
      | THREE.Mesh
      | undefined;

    if (node?.isMesh !== true) {
      throw targetConfigurationError(
        roomId,
        target.id,
        roomSeed,
        `color variant "${variant.id}" references missing mesh "${nodeName}"`,
      );
    }

    const nodeSnapshot = target.initialState.nodes.find(
      (snapshot) => snapshot.node === node,
    );

    for (const materialSnapshot of nodeSnapshot?.materials ?? []) {
      const materialName = materialSnapshot.material.name;

      if (
        requestedMaterialNames !== null &&
        !requestedMaterialNames.has(materialName)
      ) {
        continue;
      }

      foundMaterialNames.add(materialName);

      if (materialSnapshot.color !== null) {
        const initialColor = new THREE.Color().fromArray(
          materialSnapshot.color,
        );
        hasColorMaterial = true;
        changesColor ||= !initialColor.equals(color);
      }
    }
  }

  const missingMaterialName = [...(requestedMaterialNames ?? [])].find(
    (materialName) => !foundMaterialNames.has(materialName),
  );

  if (missingMaterialName !== undefined) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" references missing material "${missingMaterialName}"`,
    );
  }

  if (!hasColorMaterial || !changesColor) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" would not create a visible color change`,
    );
  }
}

function validateCanonicalColorRestore(
  target: AnomalyTarget,
  variant: Extract<PreparedAnomalyVariant, { kind: 'color' }>,
  roomId: string,
  roomSeed: number,
): void {
  const restoresVisibleColor = target.initialState.nodes.some(
    (snapshot) =>
      snapshot.materials.some((materialSnapshot) => {
        const currentColor = (
          materialSnapshot.material as THREE.Material & {
            color?: THREE.Color;
          }
        ).color;

        return (
          currentColor?.isColor === true &&
          materialSnapshot.color !== null &&
          !currentColor.equals(
            new THREE.Color().fromArray(materialSnapshot.color),
          )
        );
      }),
  );

  if (!restoresVisibleColor) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" has no changed baseline color to restore`,
    );
  }
}

function validateMaterialColorChanges(
  target: AnomalyTarget,
  variant: Extract<PreparedAnomalyVariant, { kind: 'color' }>,
  roomId: string,
  roomSeed: number,
): void {
  const changes = variant.materialColorChanges ?? [];

  if (changes.length === 0) {
    throw targetConfigurationError(
      roomId,
      target.id,
      roomSeed,
      `color variant "${variant.id}" requires at least one material change`,
    );
  }

  for (const change of changes) {
    if (!/^#[\da-f]{6}$/iu.test(change.color)) {
      throw targetConfigurationError(
        roomId,
        target.id,
        roomSeed,
        `color variant "${variant.id}" must use six-digit hexadecimal colors`,
      );
    }

    const node = resolveRelativePath(target.object, change.nodePath) as
      | THREE.Mesh
      | null;
    const nodeSnapshot = target.initialState.nodes.find(
      (snapshot) => snapshot.node === node,
    );
    const materialSnapshot = nodeSnapshot?.materials[change.materialIndex];

    if (node?.isMesh !== true || materialSnapshot?.color === null || materialSnapshot === undefined) {
      throw targetConfigurationError(
        roomId,
        target.id,
        roomSeed,
        `color variant "${variant.id}" references missing color material ${change.materialIndex} on "${formatPath(change.nodePath)}"`,
      );
    }

    const requestedColor = new THREE.Color(change.color);
    const initialColor = new THREE.Color().fromArray(materialSnapshot.color);

    if (requestedColor.equals(initialColor)) {
      throw targetConfigurationError(
        roomId,
        target.id,
        roomSeed,
        `color variant "${variant.id}" would not change material ${change.materialIndex} on "${formatPath(change.nodePath)}"`,
      );
    }
  }
}

function resolveRelativePath(
  root: THREE.Object3D,
  path: readonly AnomalyNodePathSegment[],
): THREE.Object3D | null {
  let current = root;

  for (const segment of path) {
    const matchingChildren = current.children.filter(
      (child) => getObjectLabel(child) === segment.name,
    );
    const next = matchingChildren[segment.occurrence];

    if (next === undefined) {
      return null;
    }

    current = next;
  }

  return current;
}

function formatPath(path: readonly AnomalyNodePathSegment[]): string {
  return path.map(({ name, occurrence }) => `${name}[${occurrence}]`).join('/');
}

function getObjectLabel(object: THREE.Object3D): string {
  return object.name.length > 0 ? object.name : object.type;
}

function pickWeightedTargetIndex(
  candidates: readonly EligibleTarget[],
  random: SeededRandom,
): number {
  const totalWeight = candidates.reduce(
    (sum, candidate) => sum + candidate.target.weight,
    0,
  );
  let cursor = random.nextFloat() * totalWeight;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];

    if (candidate === undefined) {
      continue;
    }

    cursor -= candidate.target.weight;

    if (cursor < 0) {
      return index;
    }
  }

  return candidates.length - 1;
}

function targetConfigurationError(
  roomId: string,
  targetId: string,
  roomSeed: number,
  problem: string,
): Error {
  return new Error(
    `Invalid anomaly target "${targetId}" in room "${roomId}" (seed ${roomSeed}): ${problem}.`,
  );
}

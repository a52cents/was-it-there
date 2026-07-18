import * as THREE from 'three';
import {
  deriveRoomSeed,
  normalizeSeed,
  SeededRandom,
} from '../../core/random/SeededRandom';
import type { AnomalyTargetRegistry } from './AnomalyTargetRegistry';
import {
  generateAnomalyPlan,
  type AnomalyPlan,
  type GenerateAnomalyPlanOptions,
  type PlannedAnomaly,
} from './AnomalyGenerator';
import {
  restoreAnomalyCollisionObjectState,
  restoreAnomalyTargetInitialState,
  RESTORE_CANONICAL_COLORS_VARIANT_ID,
  type AnomalyTarget,
  type AnomalyNodePathSegment,
  type ColorAnomalyVariant,
  type PreparedAnomalyVariant,
} from './AnomalyTarget';
import {
  prepareLevelBuilderCatalog,
  type PreparedLevelBuilderCatalog,
} from './LevelBuilderAnomalyAdapter';
import type { LevelBuilderDocument } from '../../debug/level-builder/LevelBuilderDocument';

type RoomPlanOptions = Omit<GenerateAnomalyPlanOptions, 'targets'>;

export interface PrepareRunBaselineOptions {
  readonly runSeed: number;
  readonly roomIndex: number;
  readonly roomId: string;
}

export interface RoomBaselineSnapshot {
  readonly runSeed: number;
  readonly baselineSeed: number;
  readonly hiddenTargetIds: readonly string[];
  readonly colorChanges: readonly RoomBaselineColorChange[];
}

export interface RoomBaselineColorChange {
  readonly targetId: string;
  readonly variantId: string;
}

interface DependentTransformContext {
  readonly supportWorldMatrix: THREE.Matrix4;
  readonly objects: readonly {
    readonly object: THREE.Object3D;
    readonly worldMatrix: THREE.Matrix4;
    readonly collision: boolean;
  }[];
}

const INITIAL_ABSENCE_CHANCE = 0.7;
const INITIAL_ABSENCE_WEIGHT_MULTIPLIER = 4;
const INITIAL_COLOR_CHANCE_PER_TARGET = 0.15;
const MAX_INITIAL_COLOR_CHANGES = 2;
const INITIAL_COLOR_WEIGHT_MULTIPLIER = 3;
const BASELINE_SEED_DOMAIN = 'initial-layout';

export class RoomAnomalySystem {
  private activePlan: AnomalyPlan | null = null;
  private baselineSnapshot: RoomBaselineSnapshot | null = null;
  private readonly baselineHiddenTargetIds = new Set<string>();
  private readonly baselineColorVariantIdsByTargetId = new Map<
    string,
    string
  >();
  private preparedBuilderCatalog: PreparedLevelBuilderCatalog | null = null;
  private collisionStateDirty = false;
  private readonly builderVariantsByTargetId = new Map<
    string,
    readonly PreparedAnomalyVariant[]
  >();

  public constructor(
    private readonly registry: AnomalyTargetRegistry,
    private readonly onCollisionStateChanged: (() => void) | null = null,
  ) {}

  public generatePlan(options: RoomPlanOptions): AnomalyPlan {
    return generateAnomalyPlan({
      ...options,
      targets: this.getTargetsForCurrentBaseline(),
    });
  }

  public registerLevelBuilderCatalog(
    document: LevelBuilderDocument,
    expectedRoomId: string,
  ): PreparedLevelBuilderCatalog {
    const catalog = prepareLevelBuilderCatalog(
      document,
      this.registry,
      expectedRoomId,
    );
    const variantsByTargetId = new Map<string, PreparedAnomalyVariant[]>();

    for (const { targetId, variant } of catalog.variants) {
      const target = this.registry.getById(targetId);
      const existingIds = new Set([
        ...(target?.variants.map(({ id }) => id) ?? []),
        ...(variantsByTargetId.get(targetId)?.map(({ id }) => id) ?? []),
      ]);

      if (existingIds.has(variant.id)) {
        throw new Error(
          `Level Builder variant id "${variant.id}" is duplicated on anomaly target "${targetId}".`,
        );
      }

      const targetVariants = variantsByTargetId.get(targetId) ?? [];
      targetVariants.push(variant);
      variantsByTargetId.set(targetId, targetVariants);
    }

    this.builderVariantsByTargetId.clear();

    for (const [targetId, variants] of variantsByTargetId) {
      this.builderVariantsByTargetId.set(targetId, variants);
    }

    this.preparedBuilderCatalog = catalog;
    return catalog;
  }

  public getLevelBuilderCatalog(): PreparedLevelBuilderCatalog | null {
    return this.preparedBuilderCatalog;
  }

  public prepareRunBaseline(
    options: PrepareRunBaselineOptions,
  ): RoomBaselineSnapshot {
    this.restoreCanonicalState();
    this.baselineHiddenTargetIds.clear();
    this.baselineColorVariantIdsByTargetId.clear();

    const runSeed = normalizeSeed(options.runSeed);
    const baselineSeed = deriveRoomSeed(
      runSeed,
      options.roomIndex,
      `${options.roomId}:${BASELINE_SEED_DOMAIN}`,
    );
    const random = new SeededRandom(baselineSeed);
    const candidates = this.registry
      .getAll()
      .filter((target) =>
        this.getPreparedVariants(target).some(
          (variant) => variant.kind === 'show',
        ),
      );

    if (
      candidates.length > 0 &&
      random.nextFloat() < INITIAL_ABSENCE_CHANCE
    ) {
      const target = candidates[random.nextInteger(candidates.length)];

      if (target !== undefined) {
        this.baselineHiddenTargetIds.add(target.id);
      }
    }

    const suppressedTargetIds = this.getSuppressedTargetIds();
    const colorCandidates = this.registry
      .getAll()
      .filter(
        (target) =>
          !this.baselineHiddenTargetIds.has(target.id) &&
          !suppressedTargetIds.has(target.id),
      )
      .map((target) => ({
        target,
        colorVariants: this.getPreparedVariants(target).filter(
          (variant): variant is ColorAnomalyVariant =>
            variant.kind === 'color' &&
            variant.restoresCanonicalColors !== true,
        ),
        roll: random.nextFloat(),
      }))
      .filter(
        ({ colorVariants, roll }) =>
          colorVariants.length > 0 &&
          roll < INITIAL_COLOR_CHANCE_PER_TARGET,
      )
      .sort((first, second) => first.roll - second.roll)
      .slice(0, MAX_INITIAL_COLOR_CHANGES);

    for (const { target, colorVariants } of colorCandidates) {
      const variant =
        colorVariants[random.nextInteger(colorVariants.length)];

      if (variant !== undefined) {
        this.baselineColorVariantIdsByTargetId.set(
          target.id,
          variant.id,
        );
      }
    }

    this.restoreCurrentBaseline();
    this.baselineSnapshot = {
      runSeed,
      baselineSeed,
      hiddenTargetIds: [...this.baselineHiddenTargetIds],
      colorChanges: [
        ...this.baselineColorVariantIdsByTargetId,
      ].map(([targetId, variantId]) => ({ targetId, variantId })),
    };
    this.flushCollisionStateChanges();
    return this.baselineSnapshot;
  }

  public applyPlan(plan: AnomalyPlan): void {
    this.restoreCurrentBaseline();
    const usedTargetIds = new Set<string>();

    try {
      for (const anomaly of plan.anomalies) {
        if (usedTargetIds.has(anomaly.targetId)) {
          throw new Error(
            `Anomaly plan for room "${plan.roomId}" modifies target "${anomaly.targetId}" more than once (seed ${plan.roomSeed}).`,
          );
        }

        usedTargetIds.add(anomaly.targetId);
        this.applyAnomaly(plan, anomaly);
      }

      this.activePlan = plan;
      this.flushCollisionStateChanges();
    } catch (error: unknown) {
      this.restoreCurrentBaseline();
      this.flushCollisionStateChanges();
      throw error;
    }
  }

  public restore(): void {
    this.baselineHiddenTargetIds.clear();
    this.baselineColorVariantIdsByTargetId.clear();
    this.baselineSnapshot = null;
    this.restoreCanonicalState();
    this.flushCollisionStateChanges();
  }

  public getBaselineSnapshot(): RoomBaselineSnapshot | null {
    return this.baselineSnapshot;
  }

  private restoreCanonicalState(): void {
    for (const target of this.registry.getAll()) {
      restoreAnomalyTargetInitialState(target.initialState);
      const collisionInitialState = target.collisionInitialState ?? [];

      if (collisionInitialState.length > 0) {
        restoreAnomalyCollisionObjectState(collisionInitialState);
        this.collisionStateDirty = true;
      }

      this.setTargetInteractionVisibility(target, true);

      target.object.updateMatrixWorld(true);
    }

    this.activePlan = null;
  }

  private restoreCurrentBaseline(): void {
    this.restoreCanonicalState();

    for (const [targetId, variantId] of this
      .baselineColorVariantIdsByTargetId) {
      const target = this.registry.getById(targetId);
      const variant =
        target === null
          ? undefined
          : this.getPreparedVariants(target).find(
              (candidate) => candidate.id === variantId,
            );

      if (target === null || variant?.kind !== 'color') {
        continue;
      }

      this.applyVariant(target, variant);
      target.object.updateMatrixWorld(true);
    }

    for (const targetId of this.baselineHiddenTargetIds) {
      const target = this.registry.getById(targetId);

      if (target === null) {
        continue;
      }

      this.setTargetMeshVisibility(target, false);
      this.setDependentTargetsSuppressed(target, true);
      target.object.updateMatrixWorld(true);
    }
  }

  public getActivePlan(): AnomalyPlan | null {
    return this.activePlan;
  }

  private applyAnomaly(plan: AnomalyPlan, anomaly: PlannedAnomaly): void {
    const target = this.registry.getById(anomaly.targetId);

    if (target === null) {
      throw new Error(
        `Anomaly plan for room "${plan.roomId}" references unknown target "${anomaly.targetId}" (seed ${plan.roomSeed}).`,
      );
    }

    const variant = this.getPreparedVariants(target).find(
      (candidate) => candidate.id === anomaly.variantId,
    );

    if (variant === undefined || variant.kind !== anomaly.kind) {
      throw new Error(
        `Anomaly plan for target "${target.id}" references invalid variant "${anomaly.variantId}" of kind "${anomaly.kind}" (seed ${plan.roomSeed}).`,
      );
    }

    if (
      variant.kind === 'show' &&
      !this.baselineHiddenTargetIds.has(target.id)
    ) {
      throw new Error(
        `Anomaly plan for target "${target.id}" cannot apply show variant "${variant.id}" because the target was visible in the seeded baseline (seed ${plan.roomSeed}).`,
      );
    }

    this.applyVariant(target, variant);
    target.object.updateMatrixWorld(true);
  }

  private applyVariant(
    target: AnomalyTarget,
    variant: PreparedAnomalyVariant,
  ): void {
    switch (variant.kind) {
      case 'hide':
        this.setTargetMeshVisibility(target, false);
        this.setDependentTargetsSuppressed(target, true);
        break;
      case 'show':
        this.setTargetMeshVisibility(target, true);
        this.setDependentTargetsSuppressed(target, false);
        break;
      case 'move': {
        const dependentTransforms =
          this.captureDependentTransformContext(target);
        target.object.position.add(
          new THREE.Vector3().fromArray(variant.positionOffset),
        );
        this.applyCollisionPositionOffset(
          target,
          variant.positionOffset,
        );
        this.applyDependentTransform(target, dependentTransforms);
        break;
      }
      case 'rotate': {
        const dependentTransforms =
          this.captureDependentTransformContext(target);
        const offset = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(...variant.rotationOffsetRadians),
        );
        target.object.quaternion.multiply(offset);
        this.applyCollisionRotationOffset(target, offset);
        this.applyDependentTransform(target, dependentTransforms);
        break;
      }
      case 'scale': {
        const dependentTransforms =
          this.captureDependentTransformContext(target);
        target.object.scale.multiply(
          new THREE.Vector3().fromArray(variant.scaleMultiplier),
        );
        this.applyCollisionScaleMultiplier(
          target,
          variant.scaleMultiplier,
        );
        this.applyDependentTransform(target, dependentTransforms);
        break;
      }
      case 'color': {
        if (variant.restoresCanonicalColors === true) {
          this.restoreCanonicalTargetColors(target);
          break;
        }

        if (variant.materialColorChanges !== undefined) {
          for (const materialChange of variant.materialColorChanges) {
            const node = resolveRelativePath(
              target.object,
              materialChange.nodePath,
            ) as THREE.Mesh | null;
            const material =
              node?.isMesh === true
                ? getMaterials(node.material)[materialChange.materialIndex]
                : undefined;
            const color = (
              material as
                | (THREE.Material & { color?: THREE.Color })
                | undefined
            )?.color;

            if (color?.isColor === true) {
              color.set(materialChange.color);
            }
          }

          break;
        }

        const changedMaterials = new Set<THREE.Material>();

        for (const nodeName of variant.nodeNames) {
          const node = target.object.getObjectByName(nodeName) as THREE.Mesh;

          for (const material of getMaterials(node.material)) {
            if (
              variant.materialNames !== undefined &&
              !variant.materialNames.includes(material.name)
            ) {
              continue;
            }

            if (changedMaterials.has(material)) {
              continue;
            }

            const color = (
              material as THREE.Material & { color?: THREE.Color }
            ).color;

            if (color?.isColor === true) {
              color.set(variant.color);
              changedMaterials.add(material);
            }
          }
        }
        break;
      }
    }
  }

  private getTargetsForCurrentBaseline(): readonly AnomalyTarget[] {
    const suppressedTargetIds = this.getSuppressedTargetIds();

    return this.registry
      .getAll()
      .filter((target) => !suppressedTargetIds.has(target.id))
      .map((target) => {
        const startsHidden = this.baselineHiddenTargetIds.has(target.id);
        const baselineColorVariantId =
          this.baselineColorVariantIdsByTargetId.get(target.id);
        const variants = this.getPreparedVariants(target).filter(
          (variant) =>
            variant.id !== baselineColorVariantId &&
            (startsHidden
              ? variant.kind === 'show'
              : variant.kind !== 'show'),
        );
        const weightMultiplier = startsHidden
          ? INITIAL_ABSENCE_WEIGHT_MULTIPLIER
          : baselineColorVariantId === undefined
            ? 1
            : INITIAL_COLOR_WEIGHT_MULTIPLIER;

        return {
          ...target,
          allowedKinds: [
            ...new Set(variants.map(({ kind }) => kind)),
          ],
          variants,
          weight: target.weight * weightMultiplier,
        };
      });
  }

  private getPreparedVariants(
    target: AnomalyTarget,
  ): readonly PreparedAnomalyVariant[] {
    const variants: readonly PreparedAnomalyVariant[] = [
      ...target.variants,
      ...(this.builderVariantsByTargetId.get(target.id) ?? []),
    ];

    if (!this.baselineColorVariantIdsByTargetId.has(target.id)) {
      return variants;
    }

    return [...variants, createRestoreCanonicalColorsVariant(target)];
  }

  private getSuppressedTargetIds(): ReadonlySet<string> {
    const suppressedTargetIds = new Set<string>();

    for (const hiddenTargetId of this.baselineHiddenTargetIds) {
      const hiddenTarget = this.registry.getById(hiddenTargetId);

      if (hiddenTarget !== null) {
        for (const dependent of this.getDependentTargets(hiddenTarget)) {
          suppressedTargetIds.add(dependent.id);
        }
      }
    }

    return suppressedTargetIds;
  }

  private restoreCanonicalTargetColors(target: AnomalyTarget): void {
    for (const snapshot of target.initialState.nodes) {
      for (const materialSnapshot of snapshot.materials) {
        const color = (
          materialSnapshot.material as THREE.Material & {
            color?: THREE.Color;
          }
        ).color;

        if (color?.isColor === true && materialSnapshot.color !== null) {
          color.fromArray(materialSnapshot.color);
        }
      }
    }
  }

  private setTargetMeshVisibility(
    target: AnomalyTarget,
    visible: boolean,
  ): void {
    for (const snapshot of target.initialState.nodes) {
      const mesh = snapshot.node as THREE.Mesh;

      if (mesh.isMesh) {
        mesh.visible = visible ? snapshot.visible : false;
      }
    }

    for (const snapshot of target.collisionInitialState ?? []) {
      if (visible) {
        if (snapshot.node.parent !== snapshot.parent) {
          snapshot.parent.add(snapshot.node);
        }

        snapshot.node.visible = snapshot.visible;
      } else {
        snapshot.node.removeFromParent();
      }

      snapshot.node.updateMatrixWorld(true);
      this.collisionStateDirty = true;
    }
  }

  private setTargetInteractionVisibility(
    target: AnomalyTarget,
    visible: boolean,
  ): void {
    for (const interactionVolume of target.interactionVolumes) {
      interactionVolume.visible = visible;
    }
  }

  private setDependentTargetsSuppressed(
    support: AnomalyTarget,
    suppressed: boolean,
  ): void {
    for (const dependent of this.getDependentTargets(support)) {
      const startsHidden = this.baselineHiddenTargetIds.has(dependent.id);
      this.setTargetMeshVisibility(
        dependent,
        !suppressed && !startsHidden,
      );
      this.setTargetInteractionVisibility(dependent, !suppressed);
      dependent.object.updateMatrixWorld(true);
    }
  }

  private getDependentTargets(
    support: AnomalyTarget,
  ): readonly AnomalyTarget[] {
    const dependents: AnomalyTarget[] = [];
    const visitedIds = new Set<string>([support.id]);
    const visit = (target: AnomalyTarget): void => {
      for (const dependentId of target.dependentTargetIds ?? []) {
        if (visitedIds.has(dependentId)) {
          continue;
        }

        const dependent = this.registry.getById(dependentId);

        if (dependent === null) {
          throw new Error(
            `Anomaly support target "${target.id}" references missing dependent target "${dependentId}".`,
          );
        }

        visitedIds.add(dependentId);
        dependents.push(dependent);
        visit(dependent);
      }
    };

    visit(support);
    return dependents;
  }

  private captureDependentTransformContext(
    support: AnomalyTarget,
  ): DependentTransformContext | null {
    const dependents = this.getDependentTargets(support);

    if (dependents.length === 0) {
      return null;
    }

    support.object.updateWorldMatrix(true, false);
    const objects: {
      object: THREE.Object3D;
      worldMatrix: THREE.Matrix4;
      collision: boolean;
    }[] = [];

    for (const dependent of dependents) {
      dependent.object.updateWorldMatrix(true, false);
      objects.push({
        object: dependent.object,
        worldMatrix: dependent.object.matrixWorld.clone(),
        collision: false,
      });

      for (const collisionObject of dependent.collisionObjects ?? []) {
        collisionObject.updateWorldMatrix(true, false);
        objects.push({
          object: collisionObject,
          worldMatrix: collisionObject.matrixWorld.clone(),
          collision: true,
        });
      }
    }

    return {
      supportWorldMatrix: support.object.matrixWorld.clone(),
      objects,
    };
  }

  private applyDependentTransform(
    support: AnomalyTarget,
    context: DependentTransformContext | null,
  ): void {
    if (context === null) {
      return;
    }

    support.object.updateWorldMatrix(true, false);
    const worldDelta = support.object.matrixWorld
      .clone()
      .multiply(context.supportWorldMatrix.clone().invert());

    for (const snapshot of context.objects) {
      const desiredWorldMatrix = worldDelta
        .clone()
        .multiply(snapshot.worldMatrix);
      const parent = snapshot.object.parent;
      const localMatrix = desiredWorldMatrix.clone();

      if (parent !== null) {
        parent.updateWorldMatrix(true, false);
        localMatrix
          .copy(parent.matrixWorld)
          .invert()
          .multiply(desiredWorldMatrix);
      }

      localMatrix.decompose(
        snapshot.object.position,
        snapshot.object.quaternion,
        snapshot.object.scale,
      );
      snapshot.object.updateMatrixWorld(true);

      if (snapshot.collision) {
        this.collisionStateDirty = true;
      }
    }
  }

  private applyCollisionPositionOffset(
    target: AnomalyTarget,
    offset: readonly [number, number, number],
  ): void {
    for (const collisionObject of target.collisionObjects ?? []) {
      collisionObject.position.add(new THREE.Vector3().fromArray(offset));
      collisionObject.updateMatrixWorld(true);
      this.collisionStateDirty = true;
    }
  }

  private applyCollisionRotationOffset(
    target: AnomalyTarget,
    offset: THREE.Quaternion,
  ): void {
    for (const collisionObject of target.collisionObjects ?? []) {
      collisionObject.quaternion.multiply(offset);
      collisionObject.updateMatrixWorld(true);
      this.collisionStateDirty = true;
    }
  }

  private applyCollisionScaleMultiplier(
    target: AnomalyTarget,
    multiplier: readonly [number, number, number],
  ): void {
    for (const collisionObject of target.collisionObjects ?? []) {
      collisionObject.scale.multiply(
        new THREE.Vector3().fromArray(multiplier),
      );
      collisionObject.updateMatrixWorld(true);
      this.collisionStateDirty = true;
    }
  }

  private flushCollisionStateChanges(): void {
    if (!this.collisionStateDirty) {
      return;
    }

    this.collisionStateDirty = false;
    this.onCollisionStateChanged?.();
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

function getObjectLabel(object: THREE.Object3D): string {
  return object.name.length > 0 ? object.name : object.type;
}

function getMaterials(
  material: THREE.Material | THREE.Material[],
): readonly THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function createRestoreCanonicalColorsVariant(
  target: AnomalyTarget,
): ColorAnomalyVariant {
  const firstColor = target.initialState.nodes
    .flatMap(({ materials }) => materials)
    .find(({ color }) => color !== null)?.color;

  if (firstColor === undefined || firstColor === null) {
    throw new Error(
      `Anomaly target "${target.id}" cannot restore its canonical colors because it has no captured color material.`,
    );
  }

  return {
    id: RESTORE_CANONICAL_COLORS_VARIANT_ID,
    kind: 'color',
    nodeNames: [],
    color: `#${new THREE.Color().fromArray(firstColor).getHexString()}`,
    restoresCanonicalColors: true,
  };
}

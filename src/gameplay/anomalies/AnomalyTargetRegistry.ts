import type * as THREE from 'three';
import type { AnomalyTarget } from './AnomalyTarget';

export class AnomalyTargetRegistry {
  private readonly targets: AnomalyTarget[] = [];
  private readonly interactionVolumes: THREE.Object3D[] = [];
  private readonly targetsById = new Map<string, AnomalyTarget>();
  private readonly targetsByObject = new Map<THREE.Object3D, AnomalyTarget>();
  private readonly targetsByInteractionVolume = new Map<
    THREE.Object3D,
    AnomalyTarget
  >();

  public register(target: AnomalyTarget): void {
    if (target.id.length === 0) {
      throw new Error('An anomaly target must have a non-empty id.');
    }

    if (this.targetsById.has(target.id)) {
      throw new Error(`Duplicate anomaly target id "${target.id}".`);
    }

    if (this.targetsByObject.has(target.object)) {
      throw new Error(
        `Object "${target.object.name}" is already registered as an anomaly target.`,
      );
    }

    if (target.interactionVolumes.length === 0) {
      throw new Error(
        `Anomaly target "${target.id}" must have at least one interaction volume.`,
      );
    }

    if (!target.interactionVolumes.includes(target.interactionVolume)) {
      throw new Error(
        `Primary interaction volume for anomaly target "${target.id}" is not present in interactionVolumes.`,
      );
    }

    if (new Set(target.interactionVolumes).size !== target.interactionVolumes.length) {
      throw new Error(
        `Anomaly target "${target.id}" contains a duplicate interaction volume.`,
      );
    }

    for (const interactionVolume of target.interactionVolumes) {
      if (this.targetsByInteractionVolume.has(interactionVolume)) {
        throw new Error(
          `Interaction volume "${interactionVolume.name}" is already registered.`,
        );
      }
    }

    this.targets.push(target);
    this.interactionVolumes.push(...target.interactionVolumes);
    this.targetsById.set(target.id, target);
    this.targetsByObject.set(target.object, target);

    for (const interactionVolume of target.interactionVolumes) {
      this.targetsByInteractionVolume.set(interactionVolume, target);
    }
  }

  public getAll(): readonly AnomalyTarget[] {
    return this.targets;
  }

  public getById(id: string): AnomalyTarget | null {
    return this.targetsById.get(id) ?? null;
  }

  public getInteractionVolumes(): THREE.Object3D[] {
    return this.interactionVolumes;
  }

  public resolveInteractionObject(
    object: THREE.Object3D,
  ): AnomalyTarget | null {
    let current: THREE.Object3D | null = object;

    while (current !== null) {
      const target = this.targetsByInteractionVolume.get(current);

      if (target !== undefined) {
        return target;
      }

      current = current.parent;
    }

    return null;
  }

  public clear(): void {
    this.targets.length = 0;
    this.interactionVolumes.length = 0;
    this.targetsById.clear();
    this.targetsByObject.clear();
    this.targetsByInteractionVolume.clear();
  }
}

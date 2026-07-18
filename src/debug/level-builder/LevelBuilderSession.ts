import type * as THREE from 'three';
import {
  LEVEL_BUILDER_FORMAT_VERSION,
  applyLevelBuilderColor,
  applyLevelBuilderObjectState,
  captureLevelBuilderObjectState,
  createLevelBuilderObjectReference,
  resolveLevelBuilderObjectReference,
  validateLevelBuilderVariant,
  type LevelBuilderDocument,
  type LevelBuilderObjectReference,
  type LevelBuilderObjectState,
  type LevelBuilderVariantDefinition,
  type LevelBuilderVariantKind,
  type LevelBuilderVariantValidation,
} from './LevelBuilderDocument';
import {
  LEVEL_BUILDER_LAYOUT_FORMAT_VERSION,
  type LevelBuilderLayoutDocument,
  type LevelBuilderLayoutObject,
} from './LevelBuilderLayoutDocument';

export interface LevelBuilderSelectionSnapshot {
  readonly object: THREE.Object3D;
  readonly reference: LevelBuilderObjectReference;
  readonly before: LevelBuilderObjectState;
  readonly after: LevelBuilderObjectState;
}

export class LevelBuilderSession {
  private selection: LevelBuilderSelectionSnapshot | null = null;
  private variants: LevelBuilderVariantDefinition[] = [];

  public constructor(
    private readonly roomId: string,
    private readonly roomRoot: THREE.Object3D,
    private readonly getAnomalyTargetId: (
      object: THREE.Object3D,
    ) => string | undefined,
  ) {}

  public select(object: THREE.Object3D | null): void {
    if (object === null) {
      this.selection = null;
      return;
    }

    const state = captureLevelBuilderObjectState(object);
    this.selection = {
      object,
      reference: createLevelBuilderObjectReference(
        this.roomRoot,
        object,
        this.getAnomalyTargetId(object),
      ),
      before: state,
      after: state,
    };
  }

  public getSelection(): LevelBuilderSelectionSnapshot | null {
    return this.selection;
  }

  public captureBefore(): LevelBuilderSelectionSnapshot {
    const selection = this.requireSelection();
    this.selection = {
      ...selection,
      before: captureLevelBuilderObjectState(selection.object),
    };
    return this.selection;
  }

  public captureAfter(): LevelBuilderSelectionSnapshot {
    const selection = this.requireSelection();
    this.selection = {
      ...selection,
      after: captureLevelBuilderObjectState(selection.object),
    };
    return this.selection;
  }

  public previewBefore(): void {
    const selection = this.requireSelection();
    applyLevelBuilderObjectState(selection.object, selection.before);
  }

  public previewAfter(): void {
    const selection = this.requireSelection();
    applyLevelBuilderObjectState(selection.object, selection.after);
  }

  public setSelectedVisibility(visible: boolean): void {
    const selection = this.requireSelection();
    selection.object.visible = visible;
    selection.object.updateMatrixWorld(true);
    this.captureAfter();
  }

  public setSelectedColor(color: string): number {
    const selection = this.requireSelection();
    const changedMaterialCount = applyLevelBuilderColor(
      selection.object,
      color,
    );
    this.captureAfter();
    return changedMaterialCount;
  }

  public saveVariant(
    id: string,
    kind: LevelBuilderVariantKind,
  ): LevelBuilderVariantValidation {
    const selection = this.captureAfter();
    const variant: LevelBuilderVariantDefinition = {
      id: id.trim(),
      kind,
      target: selection.reference,
      before: selection.before,
      after: selection.after,
    };
    const validation = validateLevelBuilderVariant(variant);

    if (!validation.valid) {
      return validation;
    }

    const existingIndex = this.variants.findIndex(
      (candidate) => candidate.id === variant.id,
    );

    if (existingIndex === -1) {
      this.variants.push(variant);
    } else {
      this.variants[existingIndex] = variant;
    }

    return validation;
  }

  public deleteVariant(id: string): boolean {
    const index = this.variants.findIndex((variant) => variant.id === id);

    if (index === -1) {
      return false;
    }

    this.variants.splice(index, 1);
    return true;
  }

  public getVariants(): readonly LevelBuilderVariantDefinition[] {
    return this.variants;
  }

  public createDocument(): LevelBuilderDocument {
    return {
      formatVersion: LEVEL_BUILDER_FORMAT_VERSION,
      roomId: this.roomId,
      variants: this.variants,
    };
  }

  public createLayoutDocument(): LevelBuilderLayoutDocument {
    const objects: LevelBuilderLayoutObject[] = [];

    this.roomRoot.traverse((object) => {
      const targetId = this.getAnomalyTargetId(object);

      if (targetId === undefined) {
        return;
      }

      objects.push({
        targetId,
        nodeName: object.name,
        position: [object.position.x, object.position.y, object.position.z],
        quaternion: [
          object.quaternion.x,
          object.quaternion.y,
          object.quaternion.z,
          object.quaternion.w,
        ],
        scale: [object.scale.x, object.scale.y, object.scale.z],
        visible: object.visible,
      });
    });
    objects.sort((left, right) => left.targetId.localeCompare(right.targetId));

    return {
      formatVersion: LEVEL_BUILDER_LAYOUT_FORMAT_VERSION,
      documentType: 'room-layout',
      roomId: this.roomId,
      objects,
    };
  }

  public importDocument(document: LevelBuilderDocument): void {
    if (document.roomId !== this.roomId) {
      throw new Error(
        `Level Builder document targets room "${document.roomId}", expected "${this.roomId}".`,
      );
    }

    for (const variant of document.variants) {
      if (
        resolveLevelBuilderObjectReference(this.roomRoot, variant.target) ===
        null
      ) {
        throw new Error(
          `Variant "${variant.id}" references missing object "${variant.target.name}".`,
        );
      }
    }

    this.variants = [...document.variants];
  }

  private requireSelection(): LevelBuilderSelectionSnapshot {
    if (this.selection === null) {
      throw new Error('Select a room object in the Level Builder first.');
    }

    return this.selection;
  }
}

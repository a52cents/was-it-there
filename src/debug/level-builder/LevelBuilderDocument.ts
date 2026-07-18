import * as THREE from 'three';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';

export const LEVEL_BUILDER_FORMAT_VERSION = 1;

export const LEVEL_BUILDER_VARIANT_KINDS = [
  'show',
  'hide',
  'move',
  'rotate',
  'scale',
  'color',
] as const;

export type LevelBuilderVariantKind =
  (typeof LEVEL_BUILDER_VARIANT_KINDS)[number];

export interface LevelBuilderPathSegment {
  readonly name: string;
  readonly occurrence: number;
}

export interface LevelBuilderObjectReference {
  readonly name: string;
  readonly path: readonly LevelBuilderPathSegment[];
  readonly anomalyTargetId?: string;
}

export interface LevelBuilderMaterialColorState {
  readonly nodePath: readonly LevelBuilderPathSegment[];
  readonly materialIndex: number;
  readonly color: string;
}

export interface LevelBuilderObjectState {
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly visible: boolean;
  readonly materialColors: readonly LevelBuilderMaterialColorState[];
}

export interface LevelBuilderVariantDefinition {
  readonly id: string;
  readonly kind: LevelBuilderVariantKind;
  readonly target: LevelBuilderObjectReference;
  readonly before: LevelBuilderObjectState;
  readonly after: LevelBuilderObjectState;
}

export interface LevelBuilderDocument {
  readonly formatVersion: typeof LEVEL_BUILDER_FORMAT_VERSION;
  readonly roomId: string;
  readonly variants: readonly LevelBuilderVariantDefinition[];
}

export interface LevelBuilderVariantValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const VECTOR_EPSILON = 1e-5;
const VARIANT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function createLevelBuilderObjectReference(
  root: THREE.Object3D,
  object: THREE.Object3D,
  anomalyTargetId?: string,
): LevelBuilderObjectReference {
  if (object !== root && !isDescendantOf(object, root)) {
    throw new Error(`Object "${getObjectLabel(object)}" is outside the editable room root.`);
  }

  const reference = {
    name: getObjectLabel(object),
    path: createRelativeObjectPath(root, object),
  };

  return anomalyTargetId === undefined
    ? reference
    : { ...reference, anomalyTargetId };
}

export function resolveLevelBuilderObjectReference(
  root: THREE.Object3D,
  reference: LevelBuilderObjectReference,
): THREE.Object3D | null {
  return resolveRelativeObjectPath(root, reference.path);
}

export function captureLevelBuilderObjectState(
  object: THREE.Object3D,
): LevelBuilderObjectState {
  const materialColors: LevelBuilderMaterialColorState[] = [];

  object.traverse((node) => {
    const mesh = node as THREE.Mesh;

    if (!mesh.isMesh || !mesh.layers.isEnabled(RENDER_LAYERS.scene)) {
      return;
    }

    for (const [materialIndex, material] of getMaterials(
      mesh.material,
    ).entries()) {
      const color = (
        material as THREE.Material & { color?: THREE.Color }
      ).color;

      if (color?.isColor === true) {
        materialColors.push({
          nodePath: createRelativeObjectPath(object, node),
          materialIndex,
          color: `#${color.getHexString()}`,
        });
      }
    }
  });

  return {
    position: toVectorTuple(object.position),
    quaternion: toQuaternionTuple(object.quaternion),
    scale: toVectorTuple(object.scale),
    visible: object.visible,
    materialColors,
  };
}

export function applyLevelBuilderObjectState(
  object: THREE.Object3D,
  state: LevelBuilderObjectState,
): void {
  object.position.fromArray(state.position);
  object.quaternion.fromArray(state.quaternion);
  object.scale.fromArray(state.scale);
  object.visible = state.visible;

  for (const materialState of state.materialColors) {
    const node = resolveRelativeObjectPath(object, materialState.nodePath) as
      | THREE.Mesh
      | null;

    if (node?.isMesh !== true) {
      continue;
    }

    const material = getMaterials(node.material)[materialState.materialIndex];
    const color = (
      material as (THREE.Material & { color?: THREE.Color }) | undefined
    )?.color;

    if (color?.isColor === true) {
      color.set(materialState.color);
    }
  }

  object.updateMatrixWorld(true);
}

export function applyLevelBuilderColor(
  object: THREE.Object3D,
  colorValue: string,
): number {
  if (!/^#[\da-f]{6}$/iu.test(colorValue)) {
    throw new Error('Level Builder colors must use #RRGGBB notation.');
  }

  const changedMaterials = new Set<THREE.Material>();

  object.traverse((node) => {
    const mesh = node as THREE.Mesh;

    if (!mesh.isMesh || !mesh.layers.isEnabled(RENDER_LAYERS.scene)) {
      return;
    }

    for (const material of getMaterials(mesh.material)) {
      const color = (
        material as THREE.Material & { color?: THREE.Color }
      ).color;

      if (color?.isColor === true && !changedMaterials.has(material)) {
        color.set(colorValue);
        changedMaterials.add(material);
      }
    }
  });

  return changedMaterials.size;
}

export function validateLevelBuilderVariant(
  variant: LevelBuilderVariantDefinition,
): LevelBuilderVariantValidation {
  const errors: string[] = [];

  if (!VARIANT_ID_PATTERN.test(variant.id)) {
    errors.push('Variant id must use lowercase kebab-case.');
  }

  const changed = getChangedStateKinds(variant.before, variant.after);

  if (!changed.has(variant.kind)) {
    errors.push(
      `The captured before/after states do not contain a ${variant.kind} change.`,
    );
  }

  return { valid: errors.length === 0, errors };
}

export function serializeLevelBuilderDocument(
  document: LevelBuilderDocument,
): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function parseLevelBuilderDocument(source: string): LevelBuilderDocument {
  const value: unknown = JSON.parse(source);

  if (!isRecord(value)) {
    throw new Error('Level Builder JSON must contain an object.');
  }

  if (value.formatVersion !== LEVEL_BUILDER_FORMAT_VERSION) {
    throw new Error(
      `Unsupported Level Builder format version "${String(value.formatVersion)}".`,
    );
  }

  if (typeof value.roomId !== 'string' || value.roomId.length === 0) {
    throw new Error('Level Builder JSON requires a roomId.');
  }

  if (!Array.isArray(value.variants)) {
    throw new Error('Level Builder JSON requires a variants array.');
  }

  const variants = value.variants.map(parseVariantDefinition);
  const ids = new Set<string>();

  for (const variant of variants) {
    if (ids.has(variant.id)) {
      throw new Error(`Duplicate Level Builder variant id "${variant.id}".`);
    }

    ids.add(variant.id);
  }

  return {
    formatVersion: LEVEL_BUILDER_FORMAT_VERSION,
    roomId: value.roomId,
    variants,
  };
}

function parseVariantDefinition(
  value: unknown,
  index: number,
): LevelBuilderVariantDefinition {
  if (!isRecord(value)) {
    throw new Error(`Variant ${index + 1} must be an object.`);
  }

  if (typeof value.id !== 'string') {
    throw new Error(`Variant ${index + 1} requires an id.`);
  }

  if (!isVariantKind(value.kind)) {
    throw new Error(`Variant "${value.id}" has an unsupported kind.`);
  }

  const variant: LevelBuilderVariantDefinition = {
    id: value.id,
    kind: value.kind,
    target: parseObjectReference(value.target, value.id),
    before: parseObjectState(value.before, value.id, 'before'),
    after: parseObjectState(value.after, value.id, 'after'),
  };
  const validation = validateLevelBuilderVariant(variant);

  if (!validation.valid) {
    throw new Error(
      `Invalid variant "${variant.id}": ${validation.errors.join(' ')}`,
    );
  }

  return variant;
}

function parseObjectReference(
  value: unknown,
  variantId: string,
): LevelBuilderObjectReference {
  if (!isRecord(value) || typeof value.name !== 'string') {
    throw new Error(`Variant "${variantId}" requires a target reference.`);
  }

  const path = parsePath(value.path, variantId);
  return typeof value.anomalyTargetId === 'string'
    ? { name: value.name, path, anomalyTargetId: value.anomalyTargetId }
    : { name: value.name, path };
}

function parseObjectState(
  value: unknown,
  variantId: string,
  stateName: 'before' | 'after',
): LevelBuilderObjectState {
  if (!isRecord(value)) {
    throw new Error(`Variant "${variantId}" requires a ${stateName} state.`);
  }

  if (
    !isNumberTuple(value.position, 3) ||
    !isNumberTuple(value.quaternion, 4) ||
    !isNumberTuple(value.scale, 3) ||
    typeof value.visible !== 'boolean' ||
    !Array.isArray(value.materialColors)
  ) {
    throw new Error(`Variant "${variantId}" has an invalid ${stateName} state.`);
  }

  const materialColors = value.materialColors.map((materialValue) => {
    if (
      !isRecord(materialValue) ||
      !Number.isInteger(materialValue.materialIndex) ||
      (materialValue.materialIndex as number) < 0 ||
      typeof materialValue.color !== 'string' ||
      !/^#[\da-f]{6}$/iu.test(materialValue.color)
    ) {
      throw new Error(
        `Variant "${variantId}" has an invalid material color state.`,
      );
    }

    return {
      nodePath: parsePath(materialValue.nodePath, variantId),
      materialIndex: materialValue.materialIndex as number,
      color: materialValue.color,
    };
  });

  return {
    position: value.position,
    quaternion: value.quaternion,
    scale: value.scale,
    visible: value.visible,
    materialColors,
  };
}

function parsePath(
  value: unknown,
  variantId: string,
): readonly LevelBuilderPathSegment[] {
  if (!Array.isArray(value)) {
    throw new Error(`Variant "${variantId}" has an invalid object path.`);
  }

  return value.map((segment) => {
    if (
      !isRecord(segment) ||
      typeof segment.name !== 'string' ||
      !Number.isInteger(segment.occurrence) ||
      (segment.occurrence as number) < 0
    ) {
      throw new Error(`Variant "${variantId}" has an invalid path segment.`);
    }

    return {
      name: segment.name,
      occurrence: segment.occurrence as number,
    };
  });
}

function getChangedStateKinds(
  before: LevelBuilderObjectState,
  after: LevelBuilderObjectState,
): ReadonlySet<LevelBuilderVariantKind> {
  const kinds = new Set<LevelBuilderVariantKind>();

  if (before.visible && !after.visible) {
    kinds.add('hide');
  }

  if (!before.visible && after.visible) {
    kinds.add('show');
  }

  if (!tuplesEqual(before.position, after.position)) {
    kinds.add('move');
  }

  if (!tuplesEqual(before.quaternion, after.quaternion)) {
    kinds.add('rotate');
  }

  if (!tuplesEqual(before.scale, after.scale)) {
    kinds.add('scale');
  }

  if (
    JSON.stringify(before.materialColors) !==
    JSON.stringify(after.materialColors)
  ) {
    kinds.add('color');
  }

  return kinds;
}

function createRelativeObjectPath(
  root: THREE.Object3D,
  object: THREE.Object3D,
): readonly LevelBuilderPathSegment[] {
  if (object === root) {
    return [];
  }

  const objects: THREE.Object3D[] = [];
  let current: THREE.Object3D | null = object;

  while (current !== null && current !== root) {
    objects.unshift(current);
    current = current.parent;
  }

  if (current !== root) {
    throw new Error(`Object "${getObjectLabel(object)}" is outside its path root.`);
  }

  return objects.map((node) => ({
    name: getObjectLabel(node),
    occurrence: getSiblingOccurrence(node),
  }));
}

function resolveRelativeObjectPath(
  root: THREE.Object3D,
  path: readonly LevelBuilderPathSegment[],
): THREE.Object3D | null {
  let current = root;

  for (const segment of path) {
    const matches = current.children.filter(
      (child) => getObjectLabel(child) === segment.name,
    );
    const next = matches[segment.occurrence];

    if (next === undefined) {
      return null;
    }

    current = next;
  }

  return current;
}

function getSiblingOccurrence(object: THREE.Object3D): number {
  const siblings = object.parent?.children ?? [object];
  const name = getObjectLabel(object);
  let occurrence = 0;

  for (const sibling of siblings) {
    if (sibling === object) {
      return occurrence;
    }

    if (getObjectLabel(sibling) === name) {
      occurrence += 1;
    }
  }

  return occurrence;
}

function getObjectLabel(object: THREE.Object3D): string {
  return object.name.length > 0 ? object.name : object.type;
}

function isDescendantOf(object: THREE.Object3D, root: THREE.Object3D): boolean {
  let current = object.parent;

  while (current !== null) {
    if (current === root) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function getMaterials(
  material: THREE.Material | THREE.Material[],
): readonly THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function toVectorTuple(
  vector: THREE.Vector3,
): readonly [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

function toQuaternionTuple(
  quaternion: THREE.Quaternion,
): readonly [number, number, number, number] {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function tuplesEqual(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return left.every(
    (value, index) => Math.abs(value - (right[index] ?? 0)) <= VECTOR_EPSILON,
  );
}

function isVariantKind(value: unknown): value is LevelBuilderVariantKind {
  return LEVEL_BUILDER_VARIANT_KINDS.some((kind) => kind === value);
}

function isNumberTuple(
  value: unknown,
  length: number,
): value is [number, number, number] & [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((component) =>
      typeof component === 'number' && Number.isFinite(component),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

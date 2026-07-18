import * as THREE from 'three';
import type {
  LevelBuilderDocument,
  LevelBuilderMaterialColorState,
  LevelBuilderObjectState,
  LevelBuilderPathSegment,
  LevelBuilderVariantDefinition,
  LevelBuilderVariantKind,
} from '../../debug/level-builder/LevelBuilderDocument';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';
import type {
  AnomalyMaterialColorChange,
  AnomalyTarget,
  PreparedAnomalyVariant,
  SnapshotVector3,
} from './AnomalyTarget';
import type { AnomalyTargetRegistry } from './AnomalyTargetRegistry';

export interface PreparedLevelBuilderVariant {
  readonly targetId: string;
  readonly variant: PreparedAnomalyVariant;
}

export interface PreparedLevelBuilderCatalog {
  readonly roomId: string;
  readonly variants: readonly PreparedLevelBuilderVariant[];
  readonly targetIds: readonly string[];
}

const STATE_EPSILON = 1e-4;

export function prepareLevelBuilderCatalog(
  document: LevelBuilderDocument,
  registry: AnomalyTargetRegistry,
  expectedRoomId: string,
): PreparedLevelBuilderCatalog {
  if (document.roomId !== expectedRoomId) {
    throw new Error(
      `Level Builder catalog targets room "${document.roomId}", expected "${expectedRoomId}".`,
    );
  }

  const variants = document.variants.map((definition) => {
    const targetId = definition.target.anomalyTargetId;

    if (targetId === undefined) {
      throw catalogError(
        definition,
        'must target a registered anomaly object',
      );
    }

    const target = registry.getById(targetId);

    if (target === null) {
      throw catalogError(
        definition,
        `references unknown anomaly target "${targetId}"`,
      );
    }

    if (definition.target.name !== target.object.name) {
      throw catalogError(
        definition,
        `references object "${definition.target.name}", but target "${targetId}" is "${target.object.name}"`,
      );
    }

    validateBeforeTransform(definition, target);
    validateSingleChangeKind(definition);

    return {
      targetId,
      variant: prepareVariant(definition, target),
    };
  });

  return {
    roomId: document.roomId,
    variants,
    targetIds: [...new Set(variants.map(({ targetId }) => targetId))],
  };
}

function prepareVariant(
  definition: LevelBuilderVariantDefinition,
  target: AnomalyTarget,
): PreparedAnomalyVariant {
  switch (definition.kind) {
    case 'show':
      return { id: definition.id, kind: 'show' };
    case 'hide':
      return { id: definition.id, kind: 'hide' };
    case 'move':
      return {
        id: definition.id,
        kind: 'move',
        positionOffset: subtractVectors(
          definition.after.position,
          definition.before.position,
        ),
      };
    case 'rotate': {
      const before = new THREE.Quaternion().fromArray(
        definition.before.quaternion,
      );
      const after = new THREE.Quaternion().fromArray(
        definition.after.quaternion,
      );
      const offset = before.invert().multiply(after).normalize();
      const euler = new THREE.Euler().setFromQuaternion(offset, 'XYZ');

      return {
        id: definition.id,
        kind: 'rotate',
        rotationOffsetRadians: [euler.x, euler.y, euler.z],
      };
    }
    case 'scale':
      return {
        id: definition.id,
        kind: 'scale',
        scaleMultiplier: createScaleMultiplier(definition),
      };
    case 'color':
      return prepareColorVariant(definition, target);
  }
}

function prepareColorVariant(
  definition: LevelBuilderVariantDefinition,
  target: AnomalyTarget,
): PreparedAnomalyVariant {
  const beforeColors = indexMaterialColors(definition.before.materialColors);
  const changes: AnomalyMaterialColorChange[] = [];

  for (const afterColor of definition.after.materialColors) {
    const key = createMaterialColorKey(afterColor);
    const beforeColor = beforeColors.get(key);

    if (beforeColor === undefined || beforeColor.color === afterColor.color) {
      continue;
    }

    const node = resolveRelativePath(target.object, afterColor.nodePath) as
      | THREE.Mesh
      | null;

    if (node?.isMesh !== true) {
      throw catalogError(
        definition,
        `references missing material node "${formatPath(afterColor.nodePath)}"`,
      );
    }

    if (!node.layers.isEnabled(RENDER_LAYERS.scene)) {
      continue;
    }

    const material = getMaterials(node.material)[afterColor.materialIndex];
    const currentColor = getMaterialColor(material);

    if (currentColor === null) {
      throw catalogError(
        definition,
        `references non-color material ${afterColor.materialIndex} on "${formatPath(afterColor.nodePath)}"`,
      );
    }

    if (currentColor !== beforeColor.color.toLowerCase()) {
      throw catalogError(
        definition,
        `has stale BEFORE color ${beforeColor.color} for "${formatPath(afterColor.nodePath)}"; room currently uses ${currentColor}`,
      );
    }

    changes.push({
      nodePath: afterColor.nodePath,
      materialIndex: afterColor.materialIndex,
      color: afterColor.color.toLowerCase(),
    });
  }

  if (changes.length === 0) {
    throw catalogError(definition, 'contains no runtime color change');
  }

  const colors = new Set(changes.map(({ color }) => color));

  if (colors.size !== 1) {
    throw catalogError(
      definition,
      'must apply one color per variant; create separate variants for different colors',
    );
  }

  const color = changes[0]?.color;

  if (color === undefined) {
    throw catalogError(definition, 'contains no color value');
  }

  return {
    id: definition.id,
    kind: 'color',
    nodeNames: [
      ...new Set(
        changes.map((change) => {
          const node = resolveRelativePath(target.object, change.nodePath);
          return node?.name ?? '';
        }),
      ),
    ].filter((name) => name.length > 0),
    color,
    materialColorChanges: changes,
  };
}

function validateBeforeTransform(
  definition: LevelBuilderVariantDefinition,
  target: AnomalyTarget,
): void {
  const before = definition.before;

  assertTupleMatches(definition, 'position', before.position, target.object.position.toArray());
  assertQuaternionMatches(
    definition,
    before.quaternion,
    target.object.quaternion.toArray(),
  );
  assertTupleMatches(definition, 'scale', before.scale, target.object.scale.toArray());

  if (definition.kind !== 'show' && before.visible !== target.object.visible) {
    throw catalogError(
      definition,
      `has stale BEFORE visibility ${String(before.visible)}; room currently uses ${String(target.object.visible)}`,
    );
  }
}

function validateSingleChangeKind(
  definition: LevelBuilderVariantDefinition,
): void {
  const changes = getChangedKinds(definition.before, definition.after);
  const unexpected = [...changes].filter((kind) => kind !== definition.kind);

  if (unexpected.length > 0) {
    throw catalogError(
      definition,
      `also changes ${unexpected.join(', ')}; save each change as its own variant`,
    );
  }
}

function getChangedKinds(
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

  if (!tuplesMatch(before.position, after.position)) {
    kinds.add('move');
  }

  if (!quaternionsMatch(before.quaternion, after.quaternion)) {
    kinds.add('rotate');
  }

  if (!tuplesMatch(before.scale, after.scale)) {
    kinds.add('scale');
  }

  const beforeColors = indexMaterialColors(before.materialColors);
  const afterColors = indexMaterialColors(after.materialColors);

  if (
    beforeColors.size !== afterColors.size ||
    [...beforeColors].some(
      ([key, color]) => afterColors.get(key)?.color !== color.color,
    )
  ) {
    kinds.add('color');
  }

  return kinds;
}

function createScaleMultiplier(
  definition: LevelBuilderVariantDefinition,
): SnapshotVector3 {
  const values = definition.before.scale.map((before, index) => {
    if (Math.abs(before) <= STATE_EPSILON) {
      throw catalogError(
        definition,
        'cannot derive scale from a zero BEFORE component',
      );
    }

    return (definition.after.scale[index] ?? before) / before;
  });

  return [values[0] as number, values[1] as number, values[2] as number];
}

function subtractVectors(
  after: readonly number[],
  before: readonly number[],
): SnapshotVector3 {
  return [
    (after[0] ?? 0) - (before[0] ?? 0),
    (after[1] ?? 0) - (before[1] ?? 0),
    (after[2] ?? 0) - (before[2] ?? 0),
  ];
}

function assertTupleMatches(
  definition: LevelBuilderVariantDefinition,
  field: 'position' | 'scale',
  before: readonly number[],
  current: readonly number[],
): void {
  if (!tuplesMatch(before, current)) {
    throw catalogError(
      definition,
      `has a stale BEFORE ${field}; recapture it from the current room`,
    );
  }
}

function assertQuaternionMatches(
  definition: LevelBuilderVariantDefinition,
  before: readonly [number, number, number, number],
  current: readonly [number, number, number, number],
): void {
  if (!quaternionsMatch(before, current)) {
    throw catalogError(
      definition,
      'has a stale BEFORE rotation; recapture it from the current room',
    );
  }
}

function tuplesMatch(
  left: readonly number[],
  right: readonly number[],
): boolean {
  return left.every(
    (value, index) => Math.abs(value - (right[index] ?? 0)) <= STATE_EPSILON,
  );
}

function quaternionsMatch(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): boolean {
  const direct = tuplesMatch(left, right);
  const negated = tuplesMatch(left, right.map((value) => -value));
  return direct || negated;
}

function indexMaterialColors(
  colors: readonly LevelBuilderMaterialColorState[],
): ReadonlyMap<string, LevelBuilderMaterialColorState> {
  return new Map(colors.map((color) => [createMaterialColorKey(color), color]));
}

function createMaterialColorKey(
  color: LevelBuilderMaterialColorState,
): string {
  return `${JSON.stringify(color.nodePath)}:${color.materialIndex}`;
}

function resolveRelativePath(
  root: THREE.Object3D,
  path: readonly LevelBuilderPathSegment[],
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

function formatPath(path: readonly LevelBuilderPathSegment[]): string {
  return path.map(({ name, occurrence }) => `${name}[${occurrence}]`).join('/');
}

function getObjectLabel(object: THREE.Object3D): string {
  return object.name.length > 0 ? object.name : object.type;
}

function getMaterials(
  material: THREE.Material | THREE.Material[],
): readonly THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function getMaterialColor(material: THREE.Material | undefined): string | null {
  const color = (
    material as (THREE.Material & { color?: THREE.Color }) | undefined
  )?.color;
  return color?.isColor === true ? `#${color.getHexString()}` : null;
}

function catalogError(
  definition: LevelBuilderVariantDefinition,
  message: string,
): Error {
  return new Error(`Level Builder variant "${definition.id}" ${message}.`);
}

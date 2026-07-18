import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LEVEL_BUILDER_FORMAT_VERSION,
  applyLevelBuilderColor,
  applyLevelBuilderObjectState,
  captureLevelBuilderObjectState,
  createLevelBuilderObjectReference,
  parseLevelBuilderDocument,
  type LevelBuilderDocument,
  type LevelBuilderObjectState,
  type LevelBuilderVariantDefinition,
} from '../../src/debug/level-builder/LevelBuilderDocument';
import type { PlannedAnomaly } from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import bedroomAnomalyCatalog from '../../src/world/rooms/greybox-bedroom-anomalies.json';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

describe('Level Builder runtime anomaly catalog', () => {
  let room: GreyboxBedroom;
  let system: RoomAnomalySystem;

  beforeEach(() => {
    room = new GreyboxBedroom();
    room.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });
    system = new RoomAnomalySystem(room.getAnomalyTargetRegistry());
  });

  afterEach(() => {
    room.unmount();
  });

  it('loads the empty checked-in authoring catalog without affecting automatic variants', () => {
    const document = parseLevelBuilderDocument(
      JSON.stringify(bedroomAnomalyCatalog),
    );
    const catalog = system.registerLevelBuilderCatalog(
      document,
      room.definition.id,
    );

    expect(catalog).toEqual({
      roomId: room.definition.id,
      variants: [],
      targetIds: [],
    });
    expect(
      system.generatePlan({
        runSeed: 43,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 1,
      }).anomalies,
    ).toHaveLength(1);
  });

  it('prepares all six builder kinds and applies move, rotate, scale, and exact material color changes', () => {
    const target = room.getAnomalyTargetRegistry().getById('chair');

    if (target === null) {
      throw new Error('Expected the chair anomaly target.');
    }

    const before = captureLevelBuilderObjectState(target.object);
    const variants = createAllVariantKinds(target.object, before);
    const document: LevelBuilderDocument = {
      formatVersion: LEVEL_BUILDER_FORMAT_VERSION,
      roomId: room.definition.id,
      variants,
    };
    const catalog = system.registerLevelBuilderCatalog(
      document,
      room.definition.id,
    );

    expect(catalog.variants.map(({ variant }) => variant.kind)).toEqual([
      'show',
      'hide',
      'move',
      'rotate',
      'scale',
      'color',
    ]);

    system.applyPlan(createPlan({
      targetId: target.id,
      kind: 'move',
      variantId: 'builder-chair-move',
    }));
    expect(target.object.position.x).toBeCloseTo(before.position[0] + 0.4);

    system.applyPlan(createPlan({
      targetId: target.id,
      kind: 'rotate',
      variantId: 'builder-chair-rotate',
    }));
    expect(target.object.quaternion.toArray()).not.toEqual(before.quaternion);

    system.applyPlan(createPlan({
      targetId: target.id,
      kind: 'scale',
      variantId: 'builder-chair-scale',
    }));
    expect(target.object.scale.x).toBeCloseTo(before.scale[0] * 1.25);

    system.applyPlan(createPlan({
      targetId: target.id,
      kind: 'color',
      variantId: 'builder-chair-color',
    }));
    expect(
      target.initialState.nodes.some((snapshot) =>
        snapshot.materials.some(({ material }) => {
          const color = (
            material as THREE.Material & { color?: THREE.Color }
          ).color;
          return color?.getHexString() === '245c88';
        }),
      ),
    ).toBe(true);

    system.restore();
    expect(target.object.position.toArray()).toEqual(before.position);
    expect(target.object.quaternion.toArray()).toEqual(before.quaternion);
    expect(target.object.scale.toArray()).toEqual(before.scale);
  });

  it('rejects stale exports before replacing the active catalog', () => {
    const target = room.getAnomalyTargetRegistry().getById('chair');

    if (target === null) {
      throw new Error('Expected the chair anomaly target.');
    }

    const before = captureLevelBuilderObjectState(target.object);
    const moveVariant = createAllVariantKinds(target.object, before).find(
      (variant) => variant.kind === 'move',
    );

    if (moveVariant === undefined) {
      throw new Error('Expected a generated move variant.');
    }

    const document: LevelBuilderDocument = {
      formatVersion: LEVEL_BUILDER_FORMAT_VERSION,
      roomId: room.definition.id,
      variants: [moveVariant],
    };
    const staleDocument: LevelBuilderDocument = {
      ...document,
      variants: document.variants.map((variant) => ({
        ...variant,
        before: {
          ...variant.before,
          position: [99, 99, 99],
        },
      })),
    };

    expect(() =>
      system.registerLevelBuilderCatalog(
        staleDocument,
        room.definition.id,
      ),
    ).toThrow('stale BEFORE position');
    expect(system.getLevelBuilderCatalog()).toBeNull();
  });

  function createAllVariantKinds(
    object: THREE.Object3D,
    before: LevelBuilderObjectState,
  ): readonly LevelBuilderVariantDefinition[] {
    const target = createLevelBuilderObjectReference(
      room.getVisualRoot(),
      object,
      'chair',
    );
    const showBefore = { ...before, visible: false };
    const hideAfter = { ...before, visible: false };

    object.position.x += 0.4;
    const moveAfter = captureLevelBuilderObjectState(object);
    applyLevelBuilderObjectState(object, before);

    object.rotation.y += 0.35;
    const rotateAfter = captureLevelBuilderObjectState(object);
    applyLevelBuilderObjectState(object, before);

    object.scale.multiplyScalar(1.25);
    const scaleAfter = captureLevelBuilderObjectState(object);
    applyLevelBuilderObjectState(object, before);

    applyLevelBuilderColor(object, '#245c88');
    const colorAfter = captureLevelBuilderObjectState(object);
    applyLevelBuilderObjectState(object, before);

    return [
      createVariant('builder-chair-show', 'show', target, showBefore, before),
      createVariant('builder-chair-hide', 'hide', target, before, hideAfter),
      createVariant('builder-chair-move', 'move', target, before, moveAfter),
      createVariant(
        'builder-chair-rotate',
        'rotate',
        target,
        before,
        rotateAfter,
      ),
      createVariant(
        'builder-chair-scale',
        'scale',
        target,
        before,
        scaleAfter,
      ),
      createVariant(
        'builder-chair-color',
        'color',
        target,
        before,
        colorAfter,
      ),
    ];
  }
});

function createVariant(
  id: string,
  kind: LevelBuilderVariantDefinition['kind'],
  target: LevelBuilderVariantDefinition['target'],
  before: LevelBuilderObjectState,
  after: LevelBuilderObjectState,
): LevelBuilderVariantDefinition {
  return { id, kind, target, before, after };
}

function createPlan(anomaly: PlannedAnomaly) {
  return {
    runSeed: 123,
    roomSeed: 456,
    roomId: 'greybox-bedroom',
    roomIndex: 0,
    difficulty: 1,
    anomalies: [anomaly],
  } as const;
}

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AnomalyPlan,
  PlannedAnomaly,
} from '../../src/gameplay/anomalies/AnomalyGenerator';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { AnomalyTargetRegistry } from '../../src/gameplay/anomalies/AnomalyTargetRegistry';
import type {
  AnomalyTarget,
  PreparedAnomalyVariant,
} from '../../src/gameplay/anomalies/AnomalyTarget';
import {
  RESTORE_CANONICAL_COLORS_VARIANT_ID,
  RESTORE_CANONICAL_ROTATION_VARIANT_ID,
} from '../../src/gameplay/anomalies/AnomalyTarget';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

interface SerializedNodeState {
  readonly name: string;
  readonly position: readonly number[];
  readonly quaternion: readonly number[];
  readonly scale: readonly number[];
  readonly visible: boolean;
  readonly materials: readonly {
    readonly uuid: string;
    readonly color: readonly number[] | null;
  }[];
}

describe('RoomAnomalySystem', () => {
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

  it('applies every prepared variant as a visible state change and restores it exactly', () => {
    const initialRoomState = serializeRoom(room.getAnomalyTargets());

    for (const target of room.getAnomalyTargets()) {
      for (const variant of target.variants) {
        if (variant.kind === 'show') {
          continue;
        }

        system.applyPlan(createPlan(createAnomaly(target, variant)));
        expectVariantApplied(target, variant);

        system.restore();
        expect(serializeRoom(room.getAnomalyTargets())).toEqual(
          initialRoomState,
        );
      }
    }
  });

  it('uses the seed to deterministically hide an optional object before observation', () => {
    const options = {
      runSeed: 0,
      roomIndex: 0,
      roomId: room.definition.id,
    } as const;
    const first = system.prepareRunBaseline(options);
    const firstState = serializeRoom(room.getAnomalyTargets());
    const second = system.prepareRunBaseline(options);

    expect(second).toEqual(first);
    expect(serializeRoom(room.getAnomalyTargets())).toEqual(firstState);
    expect(first.hiddenTargetIds.length).toBeLessThanOrEqual(1);

    for (const targetId of first.hiddenTargetIds) {
      const target = room.getAnomalyTargetRegistry().getById(targetId);
      expect(target).not.toBeNull();
      expect(
        target?.initialState.nodes.some((snapshot) => {
          const mesh = snapshot.node as THREE.Mesh;
          return mesh.isMesh && snapshot.visible && !mesh.visible;
        }),
      ).toBe(true);
      expect(target?.interactionVolume.visible).toBe(true);
    }

    const hiddenCounts = new Set<number>();

    for (let seed = 0; seed < 100 && hiddenCounts.size < 2; seed += 1) {
      hiddenCounts.add(
        system.prepareRunBaseline({ ...options, runSeed: seed })
          .hiddenTargetIds.length,
      );
    }

    expect(hiddenCounts).toEqual(new Set([0, 1]));
  });

  it('can generate an appearance anomaly and restores the canonical room afterward', () => {
    const canonicalState = serializeRoom(room.getAnomalyTargets());
    let appearancePlan: AnomalyPlan | null = null;
    let hiddenTargetId: string | null = null;

    for (let seed = 0; seed < 1_000 && appearancePlan === null; seed += 1) {
      const baseline = system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
      });

      if (baseline.hiddenTargetIds.length === 0) {
        continue;
      }

      const plan = system.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 1,
      });

      if (plan.anomalies[0]?.kind === 'show') {
        appearancePlan = plan;
        hiddenTargetId = baseline.hiddenTargetIds[0] ?? null;
      }
    }

    expect(appearancePlan).not.toBeNull();
    expect(appearancePlan?.anomalies[0]?.targetId).toBe(hiddenTargetId);

    if (appearancePlan === null || hiddenTargetId === null) {
      throw new Error('Expected a deterministic appearance anomaly seed.');
    }

    const target = room.getAnomalyTargetRegistry().getById(hiddenTargetId);
    system.applyPlan(appearancePlan);
    expect(
      target?.initialState.nodes.some((snapshot) => {
        const mesh = snapshot.node as THREE.Mesh;
        return mesh.isMesh && snapshot.visible && mesh.visible;
      }),
    ).toBe(true);

    system.restore();
    expect(system.getBaselineSnapshot()).toBeNull();
    expect(serializeRoom(room.getAnomalyTargets())).toEqual(canonicalState);
  });

  it('seeds alternate baseline colors and can restore the original color as an anomaly', () => {
    const canonicalState = serializeRoom(room.getAnomalyTargets());
    const colorCounts = new Set<number>();
    let restorationPlan: AnomalyPlan | null = null;
    let restoredTarget: AnomalyTarget | null = null;

    for (let seed = 0; seed < 5_000; seed += 1) {
      const baseline = system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
      });
      colorCounts.add(baseline.colorChanges.length);

      expect(baseline.colorChanges.length).toBeLessThanOrEqual(2);

      for (const { targetId } of baseline.colorChanges) {
        const target = room.getAnomalyTargetRegistry().getById(targetId);
        expect(target).not.toBeNull();

        if (target !== null) {
          expect(hasChangedCanonicalColor(target)).toBe(true);
        }
      }

      if (baseline.colorChanges.length === 0) {
        continue;
      }

      const plan = system.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 1,
      });
      const restoration = plan.anomalies.find(
        ({ variantId }) =>
          variantId === RESTORE_CANONICAL_COLORS_VARIANT_ID,
      );

      if (restoration !== undefined) {
        restorationPlan = plan;
        restoredTarget = room
          .getAnomalyTargetRegistry()
          .getById(restoration.targetId);
        break;
      }
    }

    expect(colorCounts.has(0)).toBe(true);
    expect([...colorCounts].some((count) => count > 0)).toBe(true);
    expect(restorationPlan).not.toBeNull();
    expect(restoredTarget).not.toBeNull();

    if (restorationPlan === null || restoredTarget === null) {
      throw new Error(
        'Expected a deterministic canonical color restoration seed.',
      );
    }

    expect(hasChangedCanonicalColor(restoredTarget)).toBe(true);
    system.applyPlan(restorationPlan);
    expect(hasChangedCanonicalColor(restoredTarget)).toBe(false);

    system.restore();
    expect(system.getBaselineSnapshot()).toBeNull();
    expect(serializeRoom(room.getAnomalyTargets())).toEqual(canonicalState);
  });

  it('seeds tilted baseline objects and can restore their canonical orientation', () => {
    const canonicalState = serializeRoom(room.getAnomalyTargets());
    const sourceTarget = room.getAnomalyTargets()[0];

    if (sourceTarget === undefined) {
      throw new Error('Expected a source target for rotation coverage.');
    }

    const rotationRegistry = new AnomalyTargetRegistry();
    rotationRegistry.register({
      ...sourceTarget,
      id: 'corridor-style-rotatable-target',
      allowedKinds: ['hide', 'show', 'color', 'rotate'],
      variants: [
        ...sourceTarget.variants,
        {
          id: 'turned-left',
          kind: 'rotate',
          rotationOffsetRadians: [0, Math.PI / 6, 0],
        },
        {
          id: 'turned-right',
          kind: 'rotate',
          rotationOffsetRadians: [0, -Math.PI / 6, 0],
        },
      ],
    });
    const rotationSystem = new RoomAnomalySystem(rotationRegistry);
    const rotationCounts = new Set<number>();
    let restorationPlan: AnomalyPlan | null = null;
    let restoredTarget: AnomalyTarget | null = null;

    for (let seed = 0; seed < 5_000; seed += 1) {
      const baseline = rotationSystem.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
      });
      rotationCounts.add(baseline.rotationChanges.length);
      expect(baseline.rotationChanges.length).toBeLessThanOrEqual(2);

      for (const { targetId } of baseline.rotationChanges) {
        const target = rotationRegistry.getById(targetId);
        const initialRoot = target?.initialState.nodes.find(
          (snapshot) => snapshot.node === target.object,
        );
        expect(target).not.toBeNull();
        expect(target?.object.quaternion.toArray()).not.toEqual(
          initialRoot?.quaternion,
        );
      }

      if (baseline.rotationChanges.length === 0) {
        continue;
      }

      const plan = rotationSystem.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 1,
      });
      const restoration = plan.anomalies.find(
        ({ variantId }) =>
          variantId === RESTORE_CANONICAL_ROTATION_VARIANT_ID,
      );

      if (restoration !== undefined) {
        restorationPlan = plan;
        restoredTarget = rotationRegistry.getById(restoration.targetId);
        break;
      }
    }

    expect(rotationCounts.has(0)).toBe(true);
    expect([...rotationCounts].some((count) => count > 0)).toBe(true);
    expect(restorationPlan).not.toBeNull();
    expect(restoredTarget).not.toBeNull();

    if (restorationPlan === null || restoredTarget === null) {
      throw new Error(
        'Expected a deterministic canonical orientation restoration seed.',
      );
    }

    const initialRoot = restoredTarget.initialState.nodes.find(
      (snapshot) => snapshot.node === restoredTarget?.object,
    );
    rotationSystem.applyPlan(restorationPlan);
    expect(restoredTarget.object.quaternion.angleTo(
      new THREE.Quaternion().fromArray(initialRoot?.quaternion ?? [0, 0, 0, 1]),
    )).toBeLessThan(0.000_001);

    rotationSystem.restore();
    expect(serializeRoom(room.getAnomalyTargets())).toEqual(canonicalState);
  });

  it('keeps every Story prop visible during observation without disabling disappearance anomalies', () => {
    const requiredVisibleTargetIds = room
      .getAnomalyTargets()
      .map(({ id }) => id);
    let generatedDisappearance = false;

    for (let seed = 0; seed < 200; seed += 1) {
      const baseline = system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        requiredVisibleTargetIds,
      });

      expect(baseline.hiddenTargetIds).toEqual([]);
      expect(
        room.getAnomalyTargets().every((target) =>
          target.initialState.nodes.every(
            (snapshot) => !snapshot.visible || snapshot.node.visible,
          ),
        ),
      ).toBe(true);

      const plan = system.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 3,
      });

      for (const anomaly of plan.anomalies) {
        expect(anomaly.kind).not.toBe('show');
        generatedDisappearance ||= anomaly.kind === 'hide';
      }
    }

    expect(generatedDisappearance).toBe(true);

    expect(() =>
      system.prepareRunBaseline({
        runSeed: 1,
        roomIndex: 0,
        roomId: room.definition.id,
        requiredVisibleTargetIds: ['missing-story-prop'],
      }),
    ).toThrow('is not registered');
  });

  it('removes hide anomalies from protected Story clues only', () => {
    const protectedTargetIds = room
      .getAnomalyTargets()
      .slice(0, 2)
      .map(({ id }) => id);
    expect(protectedTargetIds).toHaveLength(2);
    let selectedProtectedClue = false;
    let generatedUnprotectedDisappearance = false;

    for (let seed = 0; seed < 300; seed += 1) {
      const baseline = system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        requiredVisibleTargetIds: room
          .getAnomalyTargets()
          .map(({ id }) => id),
        disappearanceProtectedTargetIds: protectedTargetIds,
      });
      expect(baseline.hiddenTargetIds).toEqual([]);

      const plan = system.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 3,
      });

      for (const anomaly of plan.anomalies) {
        if (protectedTargetIds.includes(anomaly.targetId)) {
          selectedProtectedClue = true;
          expect(anomaly.kind).toBe('color');
        } else {
          generatedUnprotectedDisappearance ||= anomaly.kind === 'hide';
        }
      }
    }

    expect(selectedProtectedClue).toBe(true);
    expect(generatedUnprotectedDisappearance).toBe(true);
    expect(() =>
      system.prepareRunBaseline({
        runSeed: 1,
        roomIndex: 0,
        roomId: room.definition.id,
        disappearanceProtectedTargetIds: ['missing-story-clue'],
      }),
    ).toThrow('Disappearance-protected Story target');
  });

  it('keeps a hidden target interaction volume available', () => {
    const target = room.getAnomalyTargets()[0];

    if (target === undefined) {
      throw new Error('Expected at least one anomaly target.');
    }

    system.applyPlan(
      createPlan({
        targetId: target.id,
        kind: 'hide',
        variantId: 'hidden',
      }),
    );

    expect(target.object.visible).toBe(true);
    expect(target.interactionVolume.visible).toBe(true);
    expect(
      target.initialState.nodes
        .filter((snapshot) => (snapshot.node as THREE.Mesh).isMesh)
        .every((snapshot) => !snapshot.node.visible),
    ).toBe(true);
  });

  it('restores the room if an invalid plan fails after a first mutation', () => {
    const target = room.getAnomalyTargets()[0];

    if (target === undefined) {
      throw new Error('Expected at least one anomaly target.');
    }

    const initialRoomState = serializeRoom(room.getAnomalyTargets());
    const anomaly: PlannedAnomaly = {
      targetId: target.id,
      kind: 'hide',
      variantId: 'hidden',
    };

    expect(() =>
      system.applyPlan(createPlan(anomaly, anomaly)),
    ).toThrow('more than once');
    expect(system.getActivePlan()).toBeNull();
    expect(serializeRoom(room.getAnomalyTargets())).toEqual(initialRoomState);
  });

  it('restores original material assignments as well as their colors', () => {
    const target = room
      .getAnomalyTargets()
      .find((candidate) => candidate.id === 'picture');
    const image = target?.object.getObjectByName(
      'Picture_Image',
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.Material> | undefined;

    if (target === undefined || image === undefined) {
      throw new Error('Expected the picture anomaly target.');
    }

    const originalMaterial = image.material as THREE.MeshStandardMaterial;
    const replacement = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    image.material = replacement;
    originalMaterial.color.set(0x000000);

    system.restore();

    expect(image.material).toBe(originalMaterial);
    expect(originalMaterial.color.getHex()).toBe(0x65577f);
    replacement.dispose();
  });

  it('generates from initial data even while a color anomaly is active', () => {
    const options = {
      runSeed: 0,
      roomIndex: 0,
      roomId: room.definition.id,
      difficulty: 1,
      count: 1,
    } as const;
    const initialPlan = system.generatePlan(options);

    expect(initialPlan.anomalies[0]?.kind).toBe('color');
    system.applyPlan(initialPlan);

    expect(system.generatePlan(options)).toEqual(initialPlan);
  });

  function createPlan(...anomalies: PlannedAnomaly[]): AnomalyPlan {
    return {
      runSeed: 123,
      roomSeed: 456,
      roomId: room.definition.id,
      roomIndex: 0,
      difficulty: 1,
      anomalies,
    };
  }
});

function createAnomaly(
  target: AnomalyTarget,
  variant: PreparedAnomalyVariant,
): PlannedAnomaly {
  return {
    targetId: target.id,
    kind: variant.kind,
    variantId: variant.id,
  };
}

function expectVariantApplied(
  target: AnomalyTarget,
  variant: PreparedAnomalyVariant,
): void {
  switch (variant.kind) {
    case 'hide':
      expect(
        target.initialState.nodes.some((snapshot) => {
          const mesh = snapshot.node as THREE.Mesh;
          return mesh.isMesh && !mesh.visible;
        }),
      ).toBe(true);
      break;
    case 'show':
      expect(
        target.initialState.nodes.some((snapshot) => {
          const mesh = snapshot.node as THREE.Mesh;
          return mesh.isMesh && snapshot.visible && mesh.visible;
        }),
      ).toBe(true);
      break;
    case 'move': {
      const initialRoot = target.initialState.nodes.find(
        (snapshot) => snapshot.node === target.object,
      );
      expect(target.object.position.toArray()).not.toEqual(
        initialRoot?.position,
      );
      break;
    }
    case 'rotate': {
      const initialRoot = target.initialState.nodes.find(
        (snapshot) => snapshot.node === target.object,
      );
      expect(target.object.quaternion.toArray()).not.toEqual(
        initialRoot?.quaternion,
      );
      break;
    }
    case 'scale': {
      const initialRoot = target.initialState.nodes.find(
        (snapshot) => snapshot.node === target.object,
      );
      expect(target.object.scale.toArray()).not.toEqual(initialRoot?.scale);
      break;
    }
    case 'color': {
      const expectedColor = new THREE.Color(variant.color);
      const changedNodes = variant.nodeNames.map((nodeName) =>
        target.object.getObjectByName(nodeName),
      );
      expect(
        changedNodes.some((node) => {
          const mesh = node as THREE.Mesh;
          return (
            mesh.isMesh &&
            getMaterials(mesh.material).some((material) => {
              const color = (
                material as THREE.Material & { color?: THREE.Color }
              ).color;
              return color?.equals(expectedColor) === true;
            })
          );
        }),
      ).toBe(true);
      break;
    }
  }
}

function serializeRoom(
  targets: readonly AnomalyTarget[],
): readonly (readonly SerializedNodeState[])[] {
  return targets.map((target) =>
    target.initialState.nodes.map(({ node }) => {
      const mesh = node as THREE.Mesh;
      return {
        name: node.name,
        position: node.position.toArray(),
        quaternion: node.quaternion.toArray(),
        scale: node.scale.toArray(),
        visible: node.visible,
        materials: mesh.isMesh
          ? getMaterials(mesh.material).map((material) => {
              const color = (
                material as THREE.Material & { color?: THREE.Color }
              ).color;
              return {
                uuid: material.uuid,
                color: color?.isColor === true ? color.toArray() : null,
              };
            })
          : [],
      };
    }),
  );
}

function getMaterials(
  material: THREE.Material | THREE.Material[],
): readonly THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function hasChangedCanonicalColor(target: AnomalyTarget): boolean {
  return target.initialState.nodes.some((snapshot) =>
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
}

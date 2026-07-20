import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BEDROOM_ASSET_CATALOG } from '../../src/content/rooms/BedroomAssetCatalog';
import type { AnomalyPlan } from '../../src/gameplay/anomalies/AnomalyGenerator';
import type {
  AnomalyTarget,
  PreparedAnomalyVariant,
} from '../../src/gameplay/anomalies/AnomalyTarget';
import { RoomAnomalySystem } from '../../src/gameplay/anomalies/RoomAnomalySystem';
import { AssetManager } from '../../src/world/assets/AssetManager';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

const FINAL_DECOR = [
  {
    definition: BEDROOM_ASSET_CATALOG.rugRectangle,
    objectName: 'ANOM_Rug',
    castsShadow: false,
    position: [0, 0.002, 0.45] as const,
    rotationY: 0,
    maximumSize: [2.55, 0.04, 1.65] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.bookcaseLow,
    objectName: 'ANOM_BookcaseLow',
    castsShadow: true,
    position: [1.55, 0, 3.38] as const,
    rotationY: Math.PI,
    maximumSize: [1.05, 0.82, 0.55] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.radio,
    objectName: 'ANOM_Radio',
    castsShadow: true,
    position: [1.74, 0.82, 3.23] as const,
    rotationY: Math.PI,
    maximumSize: [0.44, 0.34, 0.2] as const,
  },
  {
    definition: BEDROOM_ASSET_CATALOG.photoFrame,
    objectName: 'ANOM_PhotoFrame',
    castsShadow: true,
    position: [1.28, 0.82, 3.25] as const,
    rotationY: Math.PI,
    maximumSize: [0.3, 0.38, 0.25] as const,
  },
] as const;

const MATERIAL_NAMES_BY_URL = new Map<string, readonly string[]>([
  [BEDROOM_ASSET_CATALOG.bedDouble.url, ['carpetWhite', 'wood', 'metal', 'carpet']],
  [BEDROOM_ASSET_CATALOG.wardrobe.url, ['wood', 'metal']],
  [BEDROOM_ASSET_CATALOG.nightstand.url, ['wood', '_defaultMat', 'metal']],
  [BEDROOM_ASSET_CATALOG.tvCabinet.url, ['wood']],
  [BEDROOM_ASSET_CATALOG.television.url, ['metalDark', 'metal']],
  [BEDROOM_ASSET_CATALOG.chairCushion.url, ['wood', 'carpet']],
  [BEDROOM_ASSET_CATALOG.plantSmall.url, ['wood', 'plant']],
  [BEDROOM_ASSET_CATALOG.pictureFrame.url, ['furniture_texture']],
  [BEDROOM_ASSET_CATALOG.tableLamp.url, ['metal', 'lamp']],
  [
    BEDROOM_ASSET_CATALOG.booksStack.url,
    ['carpetDarker', 'carpetWhite', 'plant', 'metal'],
  ],
  [BEDROOM_ASSET_CATALOG.rugRectangle.url, ['carpet', 'carpetDarker']],
  [BEDROOM_ASSET_CATALOG.bookcaseLow.url, ['wood']],
  [BEDROOM_ASSET_CATALOG.radio.url, ['metalMedium', 'wood', 'metal']],
  [BEDROOM_ASSET_CATALOG.photoFrame.url, ['furniture_texture']],
]);

const SUPPLEMENTARY_TARGET_IDS = [
  'bed',
  'wardrobe',
  'nightstand',
  'tv-cabinet',
  'rug',
  'bookcase',
  'radio',
  'photo-frame',
] as const;

function createSource(url: string): THREE.Group {
  const materialNames = MATERIAL_NAMES_BY_URL.get(url);

  if (materialNames === undefined) {
    throw new Error(`Unexpected final-room URL: ${url}`);
  }

  const root = new THREE.Group();

  for (const [index, name] of materialNames.entries()) {
    const material = new THREE.MeshStandardMaterial({ color: 0x786653 });
    material.name = name;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1 - index * 0.06, 0.8, 1.4 - index * 0.06),
      material,
    );
    mesh.position.set(0.28, 0.46 + index * 0.01, -0.17);
    root.add(mesh);
  }

  return root;
}

function createMountedRoom(): {
  readonly room: GreyboxBedroom;
  readonly scene: THREE.Scene;
  readonly world: WorldCollision;
} {
  const room = new GreyboxBedroom();
  const scene = new THREE.Scene();
  const world = new WorldCollision();
  room.mount({ scene, worldCollision: world });
  return { room, scene, world };
}

describe('GreyboxBedroom final decor', () => {
  it('replaces the rug and adds three details without changing gameplay geometry', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const { room, world } = createMountedRoom();
    const oldRug = room.getVisualRoot().getObjectByName('ANOM_Rug');
    const oldRugSurface = oldRug?.getObjectByName(
      'Rug_Surface',
    ) as THREE.Mesh | undefined;

    if (oldRug === undefined || oldRugSurface === undefined) {
      throw new Error('Expected the primitive rug.');
    }

    const disposePrimitiveGeometry = vi.spyOn(
      oldRugSurface.geometry,
      'dispose',
    );
    const collisionRoot = world.getSourceRoot();
    const collisionCount = room.getCollisionObjectCount();

    await Promise.all([
      room.loadFinalDecor(manager),
      room.loadFinalDecor(manager),
    ]);
    await room.loadFinalDecor(manager);

    expect(load).toHaveBeenCalledTimes(14);
    expect(room.isFinalDecorLoaded()).toBe(true);
    expect(disposePrimitiveGeometry).toHaveBeenCalledOnce();
    expect(oldRug.parent).toBeNull();
    expect(world.getSourceRoot()).toBe(collisionRoot);
    expect(room.getCollisionObjectCount()).toBe(collisionCount);
    expect(room.getAnomalyTargets()).toHaveLength(14);
    expect(
      new Set(room.getAnomalyTargets().map((target) => target.id)),
    ).toEqual(
      new Set([
        'television',
        'chair',
        'plant',
        'picture',
        'lamp',
        'books',
        ...SUPPLEMENTARY_TARGET_IDS,
      ]),
    );
    expect(new Set(room.getFinalDecorAssetIds())).toEqual(
      new Set(FINAL_DECOR.map((decor) => decor.definition.id)),
    );

    for (const expected of FINAL_DECOR) {
      const object = room.getVisualRoot().getObjectByName(
        expected.objectName,
      );
      const model = object?.getObjectByName(`${expected.objectName}_GLB`);

      if (object === undefined || model === undefined) {
        throw new Error(`Expected final decor ${expected.objectName}.`);
      }

      const size = new THREE.Box3()
        .setFromObject(model)
        .getSize(new THREE.Vector3());
      expect(object.position.toArray()).toEqual(expected.position);
      expect(model.rotation.y).toBeCloseTo(expected.rotationY);
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;

        if (mesh.isMesh) {
          expect(mesh.castShadow).toBe(expected.castsShadow);
          expect(mesh.receiveShadow).toBe(true);
        }
      });
      expect(size.x).toBeLessThanOrEqual(expected.maximumSize[0] + 1e-6);
      expect(size.y).toBeLessThanOrEqual(expected.maximumSize[1] + 1e-6);
      expect(size.z).toBeLessThanOrEqual(expected.maximumSize[2] + 1e-6);
      expect(manager.getReferenceCount(expected.definition.id)).toBe(1);
    }

    const rebuildCollision = vi.fn(() => {
      world.buildFromObject(room.getCollisionRoot());
    });
    const system = new RoomAnomalySystem(
      room.getAnomalyTargetRegistry(),
      rebuildCollision,
    );

    for (const target of room.getAnomalyTargets()) {
      const hideVariants = target.variants.filter(
        (variant) => variant.kind === 'hide',
      );
      const showVariants = target.variants.filter(
        (variant) => variant.kind === 'show',
      );
      const moveVariants = target.variants.filter(
        (variant) => variant.kind === 'move',
      );
      const rotateVariants = target.variants.filter(
        (variant) => variant.kind === 'rotate',
      );
      const colorVariants = target.variants.filter(
        (variant) => variant.kind === 'color',
      );

      expect(target.allowedKinds, target.id).toEqual([
        'hide',
        'show',
        'color',
      ]);
      expect(hideVariants, target.id).toHaveLength(1);
      expect(showVariants, target.id).toHaveLength(1);
      expect(moveVariants, target.id).toHaveLength(0);
      expect(colorVariants, target.id).toHaveLength(2);
      expect(rotateVariants, target.id).toHaveLength(0);

      const colors = colorVariants.map((variant) => variant.color);
      expect(new Set(colors).size, target.id).toBe(2);
    }

    expect(
      room.getAnomalyTargets().reduce(
        (count, target) => count + target.variants.length,
        0,
      ),
    ).toBe(56);

    const plan = system.generatePlan({
      runSeed: 321,
      roomIndex: 0,
      roomId: room.definition.id,
      difficulty: 1,
      count: 14,
    });
    expect(
      new Set(plan.anomalies.map((anomaly) => anomaly.targetId)).size,
    ).toBe(14);
    system.applyPlan(plan);
    system.restore();

    for (const target of room.getAnomalyTargets()) {
      const canonicalState = serializeTarget(target);
      const canonicalCollisionState = serializeTargetCollisions(target);

      for (const variant of target.variants) {
        if (variant.kind === 'show') {
          continue;
        }

        system.applyPlan(createPlan(room, target, variant));
        expect(serializeTarget(target), `${target.id}/${variant.id}`).not.toEqual(
          canonicalState,
        );

        if ((target.collisionObjects?.length ?? 0) > 0) {
          if (variant.kind === 'hide') {
            expect(
              target.collisionObjects?.every(
                (collisionObject) => collisionObject.parent === null,
              ),
              `${target.id}/${variant.id}`,
            ).toBe(true);
          }

          if (variant.kind === 'move') {
            expect(
              serializeTargetCollisions(target),
              `${target.id}/${variant.id}`,
            ).not.toEqual(canonicalCollisionState);
          }
        }

        system.restore();
        expect(serializeTarget(target), `${target.id}/${variant.id}`).toEqual(
          canonicalState,
        );
        expect(
          serializeTargetCollisions(target),
          `${target.id}/${variant.id}`,
        ).toEqual(canonicalCollisionState);
      }
    }

    expect(rebuildCollision).toHaveBeenCalled();

    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
    expect(room.isFinalDecorLoaded()).toBe(false);
  }, 10_000);

  it('reloads fresh decor instances after a room remount', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const { room, scene, world } = createMountedRoom();
    await room.loadFinalDecor(manager);
    const firstRadio = room.getVisualRoot().getObjectByName('ANOM_Radio');
    room.unmount();

    room.mount({ scene, worldCollision: world });
    await room.loadFinalDecor();
    const secondRadio = room.getVisualRoot().getObjectByName('ANOM_Radio');

    expect(load).toHaveBeenCalledTimes(28);
    expect(secondRadio).not.toBe(firstRadio);
    expect(firstRadio?.parent).toBeNull();
    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('keeps props attached to their supporting furniture', async () => {
    const load = vi.fn((url: string) => Promise.resolve(createSource(url)));
    const manager = new AssetManager({ load });
    const { room } = createMountedRoom();
    await room.loadFinalDecor(manager);
    const system = new RoomAnomalySystem(
      room.getAnomalyTargetRegistry(),
    );
    const supportRelations = [
      {
        supportId: 'nightstand',
        dependentIds: ['lamp', 'books'],
      },
      {
        supportId: 'tv-cabinet',
        dependentIds: ['television'],
      },
      {
        supportId: 'bookcase',
        dependentIds: ['radio', 'photo-frame'],
      },
    ] as const;

    for (const relation of supportRelations) {
      const support = room
        .getAnomalyTargetRegistry()
        .getById(relation.supportId);
      const dependents = relation.dependentIds.map((dependentId) =>
        room.getAnomalyTargetRegistry().getById(dependentId),
      );

      if (
        support === null ||
        dependents.some((dependent) => dependent === null)
      ) {
        throw new Error(
          `Expected support relation for ${relation.supportId}.`,
        );
      }

      expect(support.dependentTargetIds).toEqual(
        relation.dependentIds,
      );
      const resolvedDependents = dependents as AnomalyTarget[];
      const hideVariant = support.variants.find(
        (variant) => variant.kind === 'hide',
      );

      if (hideVariant === undefined) {
        throw new Error(`Expected hide variant for ${support.id}.`);
      }

      system.applyPlan(createPlan(room, support, hideVariant));
      expectTargetVisualVisibility(support, false);
      expect(
        support.interactionVolumes.every((volume) => volume.visible),
      ).toBe(true);

      for (const dependent of resolvedDependents) {
        expectTargetVisualVisibility(dependent, false);
        expect(
          dependent.interactionVolumes.every((volume) => !volume.visible),
        ).toBe(true);
      }

      system.restore();

      for (const dependent of resolvedDependents) {
        expectTargetVisualVisibility(dependent, true);
        expect(
          dependent.interactionVolumes.every((volume) => volume.visible),
        ).toBe(true);
      }

    }

    const bookcase = room
      .getAnomalyTargetRegistry()
      .getById('bookcase');
    const radio = room.getAnomalyTargetRegistry().getById('radio');
    const photoFrame = room
      .getAnomalyTargetRegistry()
      .getById('photo-frame');

    if (bookcase === null || radio === null || photoFrame === null) {
      throw new Error('Expected the complete bookcase support group.');
    }

    let hiddenBookcaseSeed: number | null = null;

    for (let seed = 0; seed < 2_000; seed += 1) {
      const baseline = system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
      });

      if (baseline.hiddenTargetIds.includes(bookcase.id)) {
        hiddenBookcaseSeed = seed;
        break;
      }
    }

    expect(hiddenBookcaseSeed).not.toBeNull();
    expectTargetVisualVisibility(radio, false);
    expectTargetVisualVisibility(photoFrame, false);
    expect(radio.interactionVolume.visible).toBe(false);
    expect(photoFrame.interactionVolume.visible).toBe(false);

    if (hiddenBookcaseSeed === null) {
      throw new Error('Expected a seed with a hidden bookcase.');
    }

    const plan = system.generatePlan({
      runSeed: hiddenBookcaseSeed,
      roomIndex: 0,
      roomId: room.definition.id,
      difficulty: 1,
      count: 1,
    });
    expect(plan.anomalies[0]?.targetId).not.toBe('radio');
    expect(plan.anomalies[0]?.targetId).not.toBe('photo-frame');

    const showVariant = bookcase.variants.find(
      (variant) => variant.kind === 'show',
    );

    if (showVariant === undefined) {
      throw new Error('Expected the bookcase show variant.');
    }

    system.applyPlan(createPlan(room, bookcase, showVariant));
    expectTargetVisualVisibility(bookcase, true);
    expectTargetVisualVisibility(radio, true);
    expectTargetVisualVisibility(photoFrame, true);
    expect(radio.interactionVolume.visible).toBe(true);
    expect(photoFrame.interactionVolume.visible).toBe(true);

    let generatedProtectedFamilyDisappearance = false;

    for (let seed = 0; seed < 200; seed += 1) {
      const requiredBaseline = system.prepareRunBaseline({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        requiredVisibleTargetIds: ['radio', 'photo-frame'],
      });
      expect(requiredBaseline.hiddenTargetIds).not.toContain('bookcase');
      expect(requiredBaseline.hiddenTargetIds).not.toContain('radio');
      expect(requiredBaseline.hiddenTargetIds).not.toContain('photo-frame');

      const planWithRequiredBaseline = system.generatePlan({
        runSeed: seed,
        roomIndex: 0,
        roomId: room.definition.id,
        difficulty: 1,
        count: 3,
      });

      for (const anomaly of planWithRequiredBaseline.anomalies) {
        if (['bookcase', 'radio', 'photo-frame'].includes(anomaly.targetId)) {
          generatedProtectedFamilyDisappearance ||=
            anomaly.kind === 'hide';
        }
      }
    }

    expect(generatedProtectedFamilyDisappearance).toBe(true);

    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('keeps the primitive rug and adds nothing when one decor asset fails', async () => {
    const load = vi.fn((url: string) =>
      url === BEDROOM_ASSET_CATALOG.radio.url
        ? Promise.reject(new Error('radio is corrupt'))
        : Promise.resolve(createSource(url)),
    );
    const manager = new AssetManager({ load });
    const { room } = createMountedRoom();
    const oldRug = room.getVisualRoot().getObjectByName('ANOM_Rug');

    await expect(room.loadFinalDecor(manager)).rejects.toThrow(
      'Final bedroom decor could not be loaded',
    );

    expect(room.isFinalDecorLoaded()).toBe(false);
    expect(manager.getCachedAssetCount()).toBe(10);
    expect(room.getVisualRoot().getObjectByName('ANOM_Rug')).toBe(oldRug);
    expect(
      room.getVisualRoot().getObjectByName('ANOM_BookcaseLow'),
    ).toBeUndefined();
    expect(room.getVisualRoot().getObjectByName('ANOM_Radio')).toBeUndefined();
    expect(
      room.getVisualRoot().getObjectByName('ANOM_PhotoFrame'),
    ).toBeUndefined();
    room.unmount();
    expect(manager.getCachedAssetCount()).toBe(0);
  });
});

function createPlan(
  room: GreyboxBedroom,
  target: AnomalyTarget,
  variant: PreparedAnomalyVariant,
): AnomalyPlan {
  return {
    runSeed: 123,
    roomSeed: 456,
    roomId: room.definition.id,
    roomIndex: 0,
    difficulty: 1,
    anomalies: [
      {
        targetId: target.id,
        kind: variant.kind,
        variantId: variant.id,
      },
    ],
  };
}

function serializeTarget(target: AnomalyTarget) {
  return target.initialState.nodes.map(({ node }) => {
    const mesh = node as THREE.Mesh;
    const materials = mesh.isMesh
      ? Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      : [];

    return {
      position: node.position.toArray(),
      quaternion: node.quaternion.toArray(),
      scale: node.scale.toArray(),
      visible: node.visible,
      colors: materials.map((material) => {
        const color = (
          material as THREE.Material & { color?: THREE.Color }
        ).color;
        return color?.isColor === true ? color.toArray() : null;
      }),
    };
  });
}

function serializeTargetCollisions(target: AnomalyTarget) {
  return (target.collisionInitialState ?? []).map(({ node }) => ({
    parentName: node.parent?.name ?? null,
    position: node.position.toArray(),
    quaternion: node.quaternion.toArray(),
    scale: node.scale.toArray(),
    visible: node.visible,
  }));
}

function expectTargetVisualVisibility(
  target: AnomalyTarget,
  visible: boolean,
): void {
  const initiallyVisibleMeshes = target.initialState.nodes.filter(
    (snapshot) =>
      (snapshot.node as THREE.Mesh).isMesh && snapshot.visible,
  );

  expect(initiallyVisibleMeshes.length).toBeGreaterThan(0);
  expect(
    initiallyVisibleMeshes.every(
      (snapshot) => snapshot.node.visible === visible,
    ),
  ).toBe(true);
}

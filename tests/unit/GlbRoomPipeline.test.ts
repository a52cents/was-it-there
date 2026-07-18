import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AssetManager } from '../../src/world/assets/AssetManager';
import type { GlbAssetLoader } from '../../src/world/assets/GlbAssetLoader';
import type { GlbRoomAssetDefinition } from '../../src/world/assets/GlbRoomPipeline';
import { GlbRoomPipeline } from '../../src/world/assets/GlbRoomPipeline';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';

function createRoomSource(): THREE.Group {
  const scene = new THREE.Group();
  scene.name = 'GLTF_Scene';
  const room = new THREE.Group();
  room.name = 'ROOM_Bedroom';
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.2, 7),
    new THREE.MeshBasicMaterial(),
  );
  collider.name = 'COLLIDER_Room';
  collider.position.y = -0.1;
  const target = new THREE.Group();
  target.name = 'ANOM_Television';
  target.position.set(2, 0.7, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0x334455 });
  material.name = 'MAT_Television';
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 1.5), material);
  screen.name = 'Television_Screen';
  const interactionMain = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.2, 1.7),
    new THREE.MeshBasicMaterial(),
  );
  interactionMain.name = 'INTERACT_Television_Main';
  const interactionStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.3, 0.8),
    new THREE.MeshBasicMaterial(),
  );
  interactionStand.name = 'INTERACT_Television_Stand';
  target.add(screen, interactionStand, interactionMain);
  const light = new THREE.PointLight(0xffddaa, 1.5);
  light.name = 'LIGHT_Ceiling';
  room.add(light, target, collider);
  scene.add(room);
  return scene;
}

function createDefinition(): GlbRoomAssetDefinition {
  return {
    id: 'bedroom',
    asset: { id: 'room-bedroom', url: '/room-bedroom.glb' },
    roomRootNodeName: 'ROOM_Bedroom',
    collisionNodeNames: ['COLLIDER_Room'],
    requiredMaterialNames: ['MAT_Television'],
    anomalyTargets: [
      {
        id: 'television',
        nodeName: 'ANOM_Television',
        interactionNodeNames: [
          'INTERACT_Television_Main',
          'INTERACT_Television_Stand',
        ],
        allowedKinds: ['hide', 'color'],
        variants: [
          { id: 'hidden', kind: 'hide' },
          {
            id: 'screen-red',
            kind: 'color',
            nodeNames: ['Television_Screen'],
            color: '#ff0000',
          },
        ],
        weight: 1,
        minimumDifficulty: 1,
      },
    ],
  };
}

function createPipeline(sourceFactory = createRoomSource): {
  readonly manager: AssetManager;
  readonly pipeline: GlbRoomPipeline;
  readonly load: ReturnType<typeof vi.fn<GlbAssetLoader['load']>>;
} {
  const load = vi.fn<GlbAssetLoader['load']>(() =>
    Promise.resolve(sourceFactory()),
  );
  const manager = new AssetManager({ load });
  return { manager, pipeline: new GlbRoomPipeline(manager), load };
}

describe('GlbRoomPipeline', () => {
  it('resolves named content, builds collisions, and registers every interaction volume', async () => {
    const { manager, pipeline } = createPipeline();
    const loaded = await pipeline.load(createDefinition());
    const target = loaded.anomalyTargetRegistry.getById('television');
    const sourceCollider = loaded.scene.getObjectByName('COLLIDER_Room');
    const collisionClone = loaded.collisionRoot.getObjectByName('COLLIDER_Room');

    expect(loaded.roomRoot.name).toBe('ROOM_Bedroom');
    expect(loaded.getNode('ANOM_Television')).toBe(target?.object);
    expect(loaded.getMaterial('MAT_Television').name).toBe('MAT_Television');
    expect(sourceCollider?.visible).toBe(false);
    expect(sourceCollider?.layers.isEnabled(RENDER_LAYERS.debug)).toBe(true);
    expect(collisionClone).toBeDefined();
    expect(collisionClone).not.toBe(sourceCollider);
    expect(loaded.collisionRoot.visible).toBe(false);
    expect(target?.interactionVolumes).toHaveLength(2);
    expect(loaded.anomalyTargetRegistry.getInteractionVolumes()).toHaveLength(2);

    for (const volume of target?.interactionVolumes ?? []) {
      expect(volume.layers.isEnabled(RENDER_LAYERS.interaction)).toBe(true);
      expect(
        loaded.anomalyTargetRegistry.resolveInteractionObject(volume),
      ).toBe(target);
    }

    expect(manager.getReferenceCount('room-bedroom')).toBe(1);
    loaded.dispose();
    expect(manager.getReferenceCount('room-bedroom')).toBe(0);
  });

  it('restores room state, material state, lights, collisions, and removes additions', async () => {
    const { pipeline } = createPipeline();
    const loaded = await pipeline.load(createDefinition());
    const target = loaded.getNode('ANOM_Television');
    const material = loaded.getMaterial(
      'MAT_Television',
    ) as THREE.MeshStandardMaterial;
    const light = loaded.getNode('LIGHT_Ceiling') as THREE.PointLight;
    const collider = loaded.collisionRoot.getObjectByName('COLLIDER_Room');
    const duplicate = new THREE.Group();
    duplicate.name = 'ANOM_Duplicate';
    loaded.scene.add(duplicate);

    target.position.set(9, 9, 9);
    target.visible = false;
    material.color.set(0xff0000);
    light.intensity = 0;
    collider?.removeFromParent();
    loaded.restore();

    expect(target.position.toArray()).toEqual([2, 0.7, 0]);
    expect(target.visible).toBe(true);
    expect(material.color.getHex()).toBe(0x334455);
    expect(light.intensity).toBeCloseTo(1.5);
    expect(duplicate.parent).toBeNull();
    expect(collider?.parent).toBe(loaded.collisionRoot);
    loaded.dispose();
  });

  it('releases its asset lease when a required named node is missing', async () => {
    const { manager, pipeline } = createPipeline();
    const definition = {
      ...createDefinition(),
      roomRootNodeName: 'ROOM_Missing',
    };

    await expect(pipeline.load(definition)).rejects.toThrow(
      'Room asset "bedroom" is missing required room root "ROOM_Missing".',
    );
    expect(manager.getReferenceCount('room-bedroom')).toBe(0);
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('rejects a missing material during loading with a clear error', async () => {
    const { manager, pipeline } = createPipeline();
    const definition = {
      ...createDefinition(),
      requiredMaterialNames: ['MAT_Missing'],
    };

    await expect(pipeline.load(definition)).rejects.toThrow(
      'Room asset "bedroom" is missing required material "MAT_Missing".',
    );
    expect(manager.getReferenceCount('room-bedroom')).toBe(0);
  });

  it('rejects variant nodes outside their anomaly target', async () => {
    const { pipeline } = createPipeline();
    const base = createDefinition();
    const originalTarget = base.anomalyTargets[0];

    if (originalTarget === undefined) {
      throw new Error('Expected a test target.');
    }

    const definition: GlbRoomAssetDefinition = {
      ...base,
      anomalyTargets: [
        {
          ...originalTarget,
          variants: [
            {
              id: 'bad-color',
              kind: 'color',
              nodeNames: ['COLLIDER_Room'],
              color: '#ffffff',
            },
          ],
        },
      ],
    };

    await expect(pipeline.load(definition)).rejects.toThrow(
      'Color variant node "COLLIDER_Room" is not a descendant of anomaly target "ANOM_Television" in room asset "bedroom".',
    );
  });

  it('can dispose and reload the room without retaining scene instances', async () => {
    const { manager, pipeline, load } = createPipeline();
    const first = await pipeline.load(createDefinition());
    const firstRoot = first.scene;
    const firstTarget = first.getNode('ANOM_Television');
    first.dispose();

    const second = await pipeline.load(createDefinition());

    expect(load).toHaveBeenCalledTimes(2);
    expect(second.scene).not.toBe(firstRoot);
    expect(second.getNode('ANOM_Television')).not.toBe(firstTarget);
    expect(manager.getReferenceCount('room-bedroom')).toBe(1);
    second.dispose();
    expect(manager.getCachedAssetCount()).toBe(0);
  });

  it('does not acquire an asset for an invalid collision definition', async () => {
    const { pipeline, load } = createPipeline();
    const definition = { ...createDefinition(), collisionNodeNames: [] };

    await expect(pipeline.load(definition)).rejects.toThrow(
      'Room asset "bedroom" must declare at least one collision node.',
    );
    expect(load).not.toHaveBeenCalled();
  });
});

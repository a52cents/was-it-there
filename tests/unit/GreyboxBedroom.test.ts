import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAYER_CONFIG } from '../../src/player/PlayerConfig';
import { RENDER_LAYERS } from '../../src/rendering/RenderLayers';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { WorldCollision } from '../../src/world/WorldCollision';

const IMPORTANT_VISUAL_NAMES = [
  'ANOM_Bed',
  'ANOM_Nightstand',
  'ANOM_Wardrobe',
  'ANOM_Chair',
  'ANOM_TvStand',
  'ANOM_Television',
  'ANOM_Lamp',
  'ANOM_Plant',
  'ANOM_Picture',
  'ANOM_Books',
  'ENTRANCE_Door',
  'EXIT_Door',
] as const;

describe('GreyboxBedroom', () => {
  let room: GreyboxBedroom;
  let scene: THREE.Scene;
  let world: WorldCollision;

  beforeEach(() => {
    room = new GreyboxBedroom();
    scene = new THREE.Scene();
    world = new WorldCollision();
    room.mount({ scene, worldCollision: world });
  });

  afterEach(() => {
    room.unmount();
  });

  it('defines the expected identity and finite spawn', () => {
    expect(room.definition.id).toBe('greybox-bedroom');
    expect(room.definition.displayName).toBe('Greybox Bedroom');
    expect(room.definition.observationDurationMs).toBe(10_000);
    expect(room.definition.searchDurationMs).toBe(30_000);
    expect(room.definition.anomalyCount).toEqual({ min: 1, max: 1 });
    const spawn = room.getPlayerSpawn();
    expect([spawn.x, spawn.y, spawn.z, spawn.yaw, spawn.pitch].every(Number.isFinite)).toBe(true);
  });

  it('creates separate named visual and collision roots', () => {
    expect(room.getVisualRoot()).not.toBe(room.getCollisionRoot());
    expect(room.getVisualRoot().name).toBe('ROOM_GreyboxBedroom_VisualRoot');
    expect(room.getCollisionRoot().name).toBe('COLLIDER_GreyboxBedroom_Root');
    expect(room.getVisualObjectCount()).toBeGreaterThan(0);
    expect(room.getCollisionObjectCount()).toBeGreaterThan(0);
  });

  it('contains a floor, ceiling, and all four walls', () => {
    for (const name of [
      'FLOOR_Room',
      'CEILING_Room',
      'WALL_North',
      'WALL_South',
      'WALL_West',
      'WALL_East',
    ]) {
      expect(room.getVisualRoot().getObjectByName(name), name).toBeDefined();
    }
  });

  it('builds the first final architecture pass with stable reusable details', () => {
    const architecture = room.getVisualRoot().getObjectByName('ARCH_Bedroom');

    expect(architecture).toBeDefined();

    for (const name of [
      'ARCH_Baseboard_North',
      'ARCH_Baseboard_SouthLeft',
      'ARCH_Baseboard_EastNorth',
      'ARCH_Crown_West',
      'ARCH_Threshold_Entrance',
      'ARCH_Threshold_Exit',
      'ARCH_Window_West',
      'ARCH_Window_Glass',
      'WALL_West_North',
      'WALL_West_South',
      'WALL_West_WindowBottom',
      'WALL_West_WindowTop',
      'ARCH_Radiator_West',
      'ARCH_LightSwitch_Entrance',
      'ARCH_Outlet_North',
      'ARCH_CeilingFixture',
      'ENTRANCE_DoorInsetUpper',
      'EXIT_DoorInsetUpper',
    ]) {
      expect(architecture?.getObjectByName(name), name).toBeDefined();
      expect(
        room.getCollisionRoot().getObjectByName(name),
        `${name} must remain visual-only`,
      ).toBeUndefined();
    }

    const floor = architecture?.getObjectByName('FLOOR_Room') as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;
    const floorTexture = floor?.material.map;

    expect(floorTexture).toBeInstanceOf(THREE.DataTexture);
    expect(floorTexture?.name).toBe('TEXTURE_WoodFloor_Light');
    expect(floorTexture?.repeat.toArray()).toEqual([3, 4]);
    const northWall = architecture?.getObjectByName('WALL_North') as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;
    expect(northWall?.material.map).toBeInstanceOf(THREE.DataTexture);
    expect(northWall?.material.map?.name).toBe(
      'TEXTURE_Bedroom_AgedPlaster',
    );
    const floorImage = floorTexture?.image as
      | { readonly data?: unknown }
      | undefined;
    const floorPixels = floorImage?.data;

    if (!(floorPixels instanceof Uint8Array)) {
      throw new Error('Expected byte-backed floor texture data.');
    }

    let floorColorTotal = 0;

    for (let index = 0; index < floorPixels.length; index += 4) {
      floorColorTotal +=
        (floorPixels[index] ?? 0) +
        (floorPixels[index + 1] ?? 0) +
        (floorPixels[index + 2] ?? 0);
    }

    const averageFloorChannel =
      floorColorTotal / ((floorPixels.length / 4) * 3);
    expect(averageFloorChannel).toBeGreaterThan(105);
    expect(room.getVisualObjectCount()).toBeLessThan(150);
  });

  it('contains every required object under one unique stable name', () => {
    const nameCounts = new Map<string, number>();
    room.getVisualRoot().traverse((object) => {
      if (object.name.length > 0) {
        nameCounts.set(object.name, (nameCounts.get(object.name) ?? 0) + 1);
      }
    });

    for (const name of IMPORTANT_VISUAL_NAMES) {
      expect(nameCounts.get(name), name).toBe(1);
    }
  });

  it('uses the ceiling fixture as the only shadow-casting light', () => {
    const shadowCastingLights: THREE.Light[] = [];
    room.getVisualRoot().traverse((object) => {
      const light = object as THREE.Light;

      if (light.isLight && light.castShadow) {
        shadowCastingLights.push(light);
      }
    });

    expect(shadowCastingLights).toHaveLength(1);
    expect(shadowCastingLights[0]).toBeInstanceOf(THREE.SpotLight);
    expect(shadowCastingLights[0]?.name).toBe('LIGHT_Ceiling');

    const ceilingLight = shadowCastingLights[0] as THREE.SpotLight;
    expect(ceilingLight.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    expect(ceilingLight.position.toArray()).toEqual([0, 2.34, 0.2]);
    expect(ceilingLight.target.position.toArray()).toEqual([0, 0.15, 0.2]);
  });

  it('uses a warm focused light hierarchy with restrained secondary fills', () => {
    const visualRoot = room.getVisualRoot();
    const hemisphere = visualRoot.getObjectByName(
      'LIGHT_Ambient',
    ) as THREE.HemisphereLight | undefined;
    const roomBounce = visualRoot.getObjectByName(
      'LIGHT_RoomBounce',
    ) as THREE.AmbientLight | undefined;
    const ceiling = visualRoot.getObjectByName(
      'LIGHT_Ceiling',
    ) as THREE.SpotLight | undefined;
    const ceilingBounce = visualRoot.getObjectByName(
      'LIGHT_CeilingBounce',
    ) as THREE.PointLight | undefined;
    const windowFill = visualRoot.getObjectByName(
      'LIGHT_WindowFill',
    ) as THREE.DirectionalLight | undefined;
    const windowArea = visualRoot.getObjectByName(
      'LIGHT_WindowArea',
    ) as THREE.RectAreaLight | undefined;
    const fixtureShade = visualRoot.getObjectByName(
      'ARCH_CeilingFixture_Shade',
    ) as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;

    expect(hemisphere).toBeInstanceOf(THREE.HemisphereLight);
    expect(hemisphere?.color.getHex()).toBe(0x94a1a5);
    expect(hemisphere?.groundColor.getHex()).toBe(0x3b2d26);
    expect(hemisphere?.intensity).toBeCloseTo(0.4);
    expect(roomBounce).toBeInstanceOf(THREE.AmbientLight);
    expect(roomBounce?.intensity).toBeCloseTo(0.12);
    expect(ceiling).toBeInstanceOf(THREE.SpotLight);
    expect(ceiling?.color.getHex()).toBe(0xffc477);
    expect(ceiling?.intensity).toBeCloseTo(6.4);
    expect(ceiling?.angle).toBeCloseTo(Math.PI * 0.32);
    expect(ceiling?.penumbra).toBeCloseTo(0.64);
    expect(ceilingBounce).toBeInstanceOf(THREE.PointLight);
    expect(ceilingBounce?.intensity).toBeCloseTo(0.36);
    expect(ceilingBounce?.castShadow).toBe(false);
    expect(windowFill).toBeInstanceOf(THREE.DirectionalLight);
    expect(windowFill?.color.getHex()).toBe(0x829da6);
    expect(windowFill?.intensity).toBeCloseTo(0.27);
    expect(windowFill?.castShadow).toBe(false);
    expect(windowArea).toBeInstanceOf(THREE.RectAreaLight);
    expect(windowArea?.intensity).toBeCloseTo(0.72);
    expect([windowArea?.width, windowArea?.height]).toEqual([1.62, 1.18]);
    expect(fixtureShade?.material.emissive.getHex()).toBe(0xffb85c);
    expect(fixtureShade?.material.emissiveIntensity).toBeCloseTo(0.6);
  });

  it('exposes six fully defined anomaly targets linked to mounted objects', () => {
    const targets = room.getAnomalyTargets();
    expect(targets).toHaveLength(6);
    expect(new Set(targets.map((target) => target.id)).size).toBe(targets.length);
    expect(new Set(targets.map((target) => target.object)).size).toBe(targets.length);

    for (const target of targets) {
      expect(target.object.parent).not.toBeNull();
      expect(target.object.name.startsWith('ANOM_')).toBe(true);
      expect(target.nodeName).toBe(target.object.name);
      expect(target.allowedKinds.length).toBeGreaterThan(0);
      expect(target.variants.length).toBeGreaterThan(1);
      expect(new Set(target.variants.map((variant) => variant.id)).size).toBe(
        target.variants.length,
      );
      expect(
        target.variants.every((variant) =>
          target.allowedKinds.includes(variant.kind),
        ),
      ).toBe(true);
      expect(target.initialState.nodes.length).toBeGreaterThan(1);
      expect(target.interactionNodeNames).toEqual([
        target.interactionVolume.name,
      ]);
      expect(
        target.interactionVolume.layers.isEnabled(
          RENDER_LAYERS.interaction,
        ),
      ).toBe(true);
      expect(
        target.interactionVolume.layers.isEnabled(RENDER_LAYERS.scene),
      ).toBe(false);
      expect(target.interactionVolume.parent).toBe(target.object);
    }
  });

  it('uses a hinge-side pivot for the closed exit door', () => {
    const exitDoor = room.getExitDoor();
    const panel = exitDoor?.getObjectByName('EXIT_DoorPanel');

    expect(exitDoor).not.toBeNull();
    expect(panel).toBeDefined();
    expect(panel?.position.z).toBeCloseTo(0.5);
    expect(room.getCollisionRoot().getObjectByName('COLLIDER_ExitDoor')).toBeDefined();
  });

  it('keeps the prototype exit hidden until the door is unlocked', () => {
    const portal = room
      .getVisualRoot()
      .getObjectByName('EXIT_PrototypeLanding');
    const light = portal?.getObjectByName('EXIT_PortalLight') as
      | THREE.PointLight
      | undefined;

    expect(portal?.visible).toBe(false);
    expect(light?.intensity).toBe(0);

    room.setExitPortalProgress(0.5);

    expect(portal?.visible).toBe(true);
    expect(light?.intensity).toBeCloseTo(1.1);
  });

  it('keeps small objects out of collision while retaining essential blockers', () => {
    const collisionRoot = room.getCollisionRoot();

    for (const absentName of [
      'COLLIDER_Chair',
      'COLLIDER_Lamp',
      'COLLIDER_Plant',
      'COLLIDER_Picture',
      'COLLIDER_Books',
      'COLLIDER_Nightstand',
    ]) {
      expect(collisionRoot.getObjectByName(absentName), absentName).toBeUndefined();
    }

    for (const presentName of [
      'COLLIDER_Floor',
      'COLLIDER_Ceiling',
      'COLLIDER_WallNorth',
      'COLLIDER_Bed',
      'COLLIDER_Wardrobe',
      'COLLIDER_TvStand',
      'COLLIDER_EntranceDoor',
      'COLLIDER_ExitDoor',
    ]) {
      expect(collisionRoot.getObjectByName(presentName), presentName).toBeDefined();
    }
  });

  it('places the initial player capsule outside blocking geometry', () => {
    const spawn = room.getPlayerSpawn();
    const capsule = new Capsule(
      new THREE.Vector3(spawn.x, spawn.y + PLAYER_CONFIG.capsuleRadius, spawn.z),
      new THREE.Vector3(
        spawn.x,
        spawn.y + PLAYER_CONFIG.capsuleHeight - PLAYER_CONFIG.capsuleRadius,
        spawn.z,
      ),
      PLAYER_CONFIG.capsuleRadius,
    );

    expect(world.intersectCapsule(capsule)).toBeNull();
  });

  it('cleans references and can recreate the room after unmount', () => {
    const firstExitDoor = room.getExitDoor();
    const firstTargets = [...room.getObservationTargets()];
    const firstVisualCount = room.getVisualObjectCount();
    const firstCollisionCount = room.getCollisionObjectCount();
    const firstScreen = firstTargets
      .find((target) => target.id === 'television')
      ?.object.getObjectByName('Television_Screen') as
      | THREE.Mesh<THREE.BufferGeometry, THREE.Material>
      | undefined;

    if (firstScreen === undefined) {
      throw new Error('Expected the television screen target mesh.');
    }

    const firstGeometry = firstScreen.geometry;
    const firstMaterial = firstScreen.material;
    const firstFloor = room
      .getVisualRoot()
      .getObjectByName('FLOOR_Room') as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;
    const firstFloorTexture = firstFloor?.material.map;

    if (firstFloorTexture === null || firstFloorTexture === undefined) {
      throw new Error('Expected the final floor texture.');
    }

    const disposeGeometry = vi.spyOn(firstGeometry, 'dispose');
    const disposeMaterial = vi.spyOn(firstMaterial, 'dispose');
    const disposeFloorTexture = vi.spyOn(firstFloorTexture, 'dispose');
    room.unmount();

    expect(room.getObservationTargets()).toHaveLength(0);
    expect(room.getExitDoor()).toBeNull();
    expect(room.getVisualObjectCount()).toBe(0);
    expect(room.getCollisionObjectCount()).toBe(0);
    expect(scene.children).not.toContain(room.getVisualRoot());
    expect(world.isReady()).toBe(false);
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
    expect(disposeFloorTexture).toHaveBeenCalledOnce();

    for (const target of firstTargets) {
      expect(target.object.parent).toBeNull();
    }

    room.mount({ scene, worldCollision: world });

    expect(room.getObservationTargets()).toHaveLength(6);
    expect(room.getVisualObjectCount()).toBe(firstVisualCount);
    expect(room.getCollisionObjectCount()).toBe(firstCollisionCount);
    expect(room.getExitDoor()).not.toBe(firstExitDoor);
    expect(world.isReady()).toBe(true);

    const remountedTargets = room.getObservationTargets();
    for (const target of remountedTargets) {
      expect(firstTargets.map((oldTarget) => oldTarget.object)).not.toContain(
        target.object,
      );
    }

    const remountedScreen = remountedTargets
      .find((target) => target.id === 'television')
      ?.object.getObjectByName('Television_Screen') as
      | THREE.Mesh<THREE.BufferGeometry, THREE.Material>
      | undefined;
    expect(remountedScreen?.geometry).not.toBe(firstGeometry);
    expect(remountedScreen?.material).not.toBe(firstMaterial);
    const remountedFloor = room
      .getVisualRoot()
      .getObjectByName('FLOOR_Room') as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;
    expect(remountedFloor?.material.map).not.toBe(firstFloorTexture);
  });

  it('rejects mounting the same bedroom twice', () => {
    expect(() => room.mount({ scene, worldCollision: world })).toThrow(
      'Room "greybox-bedroom" is already mounted.',
    );
  });
});

import * as THREE from 'three';
import { HOUSE_SHELL_ASSET_CATALOG } from '../../content/rooms/HouseShellAssetCatalog';
import {
  type AssetManager,
  type GlbAssetLease,
} from '../assets/AssetManager';

type HouseShellAssetKey = keyof typeof HOUSE_SHELL_ASSET_CATALOG;

export type HouseShellRoomId =
  | 'bedroom'
  | 'bathroom'
  | 'corridor'
  | 'office'
  | 'kitchen'
  | 'dining-room'
  | 'living-room'
  | 'laundry-room'
  | 'entrance-corridor'
  | 'main-hall';

interface ModelReplacement {
  readonly targetName: string;
  readonly asset: HouseShellAssetKey;
  readonly removeNames?: readonly string[];
}

interface InstalledHouseShell {
  readonly roomId: HouseShellRoomId;
  promise: Promise<void>;
  leases: readonly GlbAssetLease[];
  textures: THREE.Texture[];
}

const HOUSE_SHELL_LAYOUTS: Readonly<
  Record<HouseShellRoomId, readonly ModelReplacement[]>
> = {
  bedroom: [
    {
      targetName: 'ENTRANCE_DoorPanel',
      asset: 'interiorDoor',
      removeNames: [
        'ENTRANCE_DoorInsetUpper',
        'ENTRANCE_DoorInsetLower',
        'ENTRANCE_DoorHandle',
      ],
    },
    {
      targetName: 'EXIT_DoorPanel',
      asset: 'interiorDoor',
      removeNames: [
        'EXIT_DoorInsetUpper',
        'EXIT_DoorInsetLower',
        'EXIT_DoorHandle',
      ],
    },
    {
      targetName: 'ARCH_Window_Glass',
      asset: 'windowLarge',
      removeNames: [
        'ARCH_Window_FrameTop',
        'ARCH_Window_FrameBottom',
        'ARCH_Window_FrameNorth',
        'ARCH_Window_FrameSouth',
        'ARCH_Window_Mullion',
      ],
    },
  ],
  bathroom: [
    {
      targetName: 'DOOR_Entrance',
      asset: 'interiorDoor',
      removeNames: ['DOOR_Entrance_Handle'],
    },
    {
      targetName: 'DOOR_Exit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_Exit_Handle'],
    },
    {
      targetName: 'ARCH_FrostedWindow',
      asset: 'windowLarge',
      removeNames: [
        'ARCH_WindowFrameTop',
        'ARCH_WindowFrameBottom',
        'ARCH_WindowFrameLeft',
        'ARCH_WindowFrameRight',
      ],
    },
  ],
  corridor: [
    { targetName: 'DOOR_Entrance', asset: 'interiorDoor' },
    {
      targetName: 'DOOR_Exit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_Exit_Handle'],
    },
  ],
  office: [
    { targetName: 'DOOR_OfficeEntrance', asset: 'interiorDoor' },
    {
      targetName: 'DOOR_OfficeExit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_OfficeExit_Handle'],
    },
    {
      targetName: 'WINDOW_OfficeBay_East',
      asset: 'windowSmall',
      removeNames: [
        'WINDOW_OfficeBay_East_Top',
        'WINDOW_OfficeBay_East_Bottom',
      ],
    },
    {
      targetName: 'WINDOW_OfficeBay_North',
      asset: 'windowLarge',
      removeNames: [
        'WINDOW_OfficeBay_North_Top',
        'WINDOW_OfficeBay_North_Bottom',
      ],
    },
    {
      targetName: 'WINDOW_OfficeBay_West',
      asset: 'windowSmall',
      removeNames: [
        'WINDOW_OfficeBay_West_Top',
        'WINDOW_OfficeBay_West_Bottom',
      ],
    },
  ],
  kitchen: [
    { targetName: 'DOOR_Kitchen_Entrance', asset: 'interiorDoor' },
    {
      targetName: 'DOOR_Kitchen_Exit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_Kitchen_ExitHandle'],
    },
    {
      targetName: 'WINDOW_Kitchen_East',
      asset: 'windowLarge',
      removeNames: [
        'WINDOW_Kitchen_EastTop',
        'WINDOW_Kitchen_EastBottom',
        'WINDOW_Kitchen_EastCenter',
      ],
    },
  ],
  'dining-room': [
    { targetName: 'DOOR_DiningRoom_Entrance', asset: 'interiorDoor' },
    {
      targetName: 'DOOR_DiningRoom_Exit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_DiningRoom_ExitHandle'],
    },
    {
      targetName: 'WINDOW_DiningRoom_AlcoveSouth',
      asset: 'windowLarge',
    },
    {
      targetName: 'WINDOW_DiningRoom_AlcoveNorth',
      asset: 'windowLarge',
    },
    {
      targetName: 'WINDOW_DiningRoom_AlcoveEast',
      asset: 'windowSmall',
    },
  ],
  'living-room': [
    {
      targetName: 'DOOR_LivingRoom_Entrance',
      asset: 'interiorDoor',
    },
    {
      targetName: 'DOOR_LivingRoom_Exit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_LivingRoom_ExitHandle'],
    },
    {
      targetName: 'WINDOW_LivingRoom_BayWest',
      asset: 'windowLarge',
    },
  ],
  'laundry-room': [
    {
      targetName: 'DOOR_LaundryRoom_Entrance',
      asset: 'interiorDoor',
    },
    {
      targetName: 'DOOR_LaundryRoom_Exit',
      asset: 'interiorDoor',
      removeNames: ['DOOR_LaundryRoom_ExitHandle'],
    },
    {
      targetName: 'WINDOW_LaundryRoom_East',
      asset: 'windowLarge',
    },
  ],
  'entrance-corridor': [
    { targetName: 'DOOR_EntranceCorridor_Entrance', asset: 'interiorDoor' },
    { targetName: 'DOOR_EntranceCorridor_Exit', asset: 'interiorDoor' },
  ],
  'main-hall': [
    { targetName: 'DOOR_MainHall_Entrance', asset: 'interiorDoor' },
    { targetName: 'DOOR_MainHall_Exit', asset: 'interiorDoor' },
  ],
};

const installedRooms = new WeakMap<object, InstalledHouseShell>();

export async function installHouseShellModels(
  owner: object,
  roomId: HouseShellRoomId,
  visualRoot: THREE.Object3D,
  assetManager: AssetManager,
  isCurrent: () => boolean,
): Promise<void> {
  const existing = installedRooms.get(owner);

  if (existing !== undefined) {
    if (existing.roomId !== roomId) {
      throw new Error('A room cannot use two different house-shell layouts.');
    }

    await existing.promise;
    return;
  }

  const state: InstalledHouseShell = {
    roomId,
    leases: [],
    textures: [],
    promise: Promise.resolve(),
  };
  state.promise = performInstallation(
    owner,
    state,
    visualRoot,
    HOUSE_SHELL_LAYOUTS[roomId],
    assetManager,
    isCurrent,
  );
  installedRooms.set(owner, state);
  await state.promise;
}

export function releaseHouseShellModels(owner: object): void {
  for (const release of takeHouseShellReleaseTasks(owner)) {
    release();
  }
}

export function takeHouseShellReleaseTasks(
  owner: object,
): readonly (() => void)[] {
  const state = installedRooms.get(owner);

  if (state === undefined) {
    return [];
  }

  installedRooms.delete(owner);
  const releases = [
    ...state.leases.map((lease) => () => lease.release()),
    ...state.textures.map((texture) => () => texture.dispose()),
  ];
  state.leases = [];
  state.textures = [];
  return releases;
}

async function performInstallation(
  owner: object,
  state: InstalledHouseShell,
  visualRoot: THREE.Object3D,
  replacements: readonly ModelReplacement[],
  assetManager: AssetManager,
  isCurrent: () => boolean,
): Promise<void> {
  const requiredAssets = [...new Set(replacements.map(({ asset }) => asset))];
  const leases = await Promise.all(
    requiredAssets.map((asset) =>
      assetManager.acquire(HOUSE_SHELL_ASSET_CATALOG[asset]),
    ),
  );
  state.leases = leases;
  const windowFrameTexture = replacements.some(
    ({ asset }) => asset === 'windowLarge' || asset === 'windowSmall',
  )
    ? createWindowFrameTexture(state.roomId)
    : null;
  state.textures = windowFrameTexture === null ? [] : [windowFrameTexture];

  try {
    if (!isCurrent() || installedRooms.get(owner) !== state) {
      throw new Error('The room changed while its doors and windows were loading.');
    }

    const leaseByAsset = new Map(
      requiredAssets.map((asset, index) => [asset, leases[index] as GlbAssetLease]),
    );
    const prepared = replacements.map((replacement) => {
      const target = visualRoot.getObjectByName(replacement.targetName) as
        | THREE.Mesh
        | undefined;
      const lease = leaseByAsset.get(replacement.asset);

      if (target === undefined || !target.isMesh || target.parent === null) {
        throw new Error(
          `House-shell target "${replacement.targetName}" is unavailable.`,
        );
      }

      if (lease === undefined) {
        throw new Error(`House-shell asset "${replacement.asset}" is unavailable.`);
      }

      return {
        replacement,
        target,
        parent: target.parent,
        model: createFittedModel(
          target,
          lease,
          replacement.asset,
          windowFrameTexture,
        ),
      };
    });

    for (const { replacement, target, parent, model } of prepared) {
      target.removeFromParent();

      for (const name of replacement.removeNames ?? []) {
        visualRoot.getObjectByName(name)?.removeFromParent();
      }

      parent.add(model);
    }
  } catch (error: unknown) {
    if (installedRooms.get(owner) === state) {
      installedRooms.delete(owner);
    }

    for (const lease of leases) {
      lease.release();
    }

    for (const texture of state.textures) {
      texture.dispose();
    }

    state.leases = [];
    state.textures = [];
    throw error;
  }
}

function createFittedModel(
  target: THREE.Mesh,
  lease: GlbAssetLease,
  asset: HouseShellAssetKey,
  windowFrameTexture: THREE.Texture | null,
): THREE.Group {
  target.geometry.computeBoundingBox();
  const targetBounds = target.geometry.boundingBox;

  if (targetBounds === null) {
    throw new Error(`House-shell target "${target.name}" has no geometry bounds.`);
  }

  const targetSize = targetBounds.getSize(new THREE.Vector3());
  const targetWidth = Math.max(targetSize.x, targetSize.z);
  const widthAlongZ = targetSize.z > targetSize.x;
  const wrapper = new THREE.Group();
  wrapper.name = target.name;
  wrapper.position.copy(target.position);
  wrapper.quaternion.copy(target.quaternion);
  wrapper.scale.copy(target.scale);
  wrapper.userData['assetId'] = lease.assetId;

  const model = lease.root.clone(true);
  model.name = `${target.name}_GLB`;
  model.position.set(0, 0, 0);
  model.rotation.set(0, widthAlongZ ? Math.PI / 2 : 0, 0);
  model.scale.set(1, 1, 1);
  harmonizeMaterials(model, asset, windowFrameTexture);
  model.updateMatrixWorld(true);
  const sourceSize = new THREE.Box3()
    .setFromObject(model)
    .getSize(new THREE.Vector3());
  const unrotatedWidth = widthAlongZ ? sourceSize.z : sourceSize.x;
  const widthScale = targetWidth / unrotatedWidth;
  const heightScale = targetSize.y / sourceSize.y;

  if (
    !Number.isFinite(widthScale) ||
    !Number.isFinite(heightScale) ||
    widthScale <= 0 ||
    heightScale <= 0
  ) {
    throw new Error(`House-shell asset "${lease.assetId}" has invalid bounds.`);
  }

  model.scale.set(widthScale, heightScale, heightScale);

  model.updateMatrixWorld(true);
  const fittedCenter = new THREE.Box3()
    .setFromObject(model)
    .getCenter(new THREE.Vector3());
  model.position.sub(fittedCenter);
  wrapper.add(model);
  return wrapper;
}

function harmonizeMaterials(
  root: THREE.Object3D,
  asset: HouseShellAssetKey,
  windowFrameTexture: THREE.Texture | null,
): void {
  const visited = new Set<THREE.Material>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.castShadow = asset === 'interiorDoor';
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    for (const material of materials) {
      if (visited.has(material)) {
        continue;
      }

      visited.add(material);
      const standard = material as THREE.MeshStandardMaterial;

      if (!standard.isMeshStandardMaterial) {
        continue;
      }

      const materialName = standard.name.toLowerCase();
      standard.metalness = 0;
      standard.roughness = 0.72;

      if (materialName.includes('wood')) {
        standard.color.set('#563728');
      } else if (materialName.includes('metal')) {
        standard.color.set('#8b6844');
        standard.metalness = 0.58;
        standard.roughness = 0.34;
      } else if (materialName.includes('white')) {
        standard.color.set('#ffffff');
        standard.map = windowFrameTexture;
        standard.roughness = 0.82;
      } else if (materialName.includes('glass')) {
        standard.color.set('#4f7480');
        standard.emissive.set('#0d2228');
        standard.emissiveIntensity = 0.12;
        standard.transparent = true;
        standard.opacity = 0.3;
        standard.depthWrite = false;
        standard.side = THREE.DoubleSide;
        standard.metalness = 0.04;
        standard.roughness = 0.18;
        standard.envMapIntensity = 0.32;
      }

      standard.needsUpdate = true;
    }
  });
}

function createWindowFrameTexture(roomId: HouseShellRoomId): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const seed = [...roomId].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const wave = Math.sin(y * 0.34 + Math.sin(x * 0.17) * 2.1) * 8;
      const fine = Math.sin((x * 19 + y * 31 + seed) * 0.21) * 4;
      const knotDistance = Math.hypot(x - 18, y - 39);
      const knot = knotDistance < 9
        ? Math.sin(knotDistance * 1.6) * 9
        : 0;
      const shade = wave + fine + knot;
      data[offset] = THREE.MathUtils.clamp(105 + shade, 0, 255);
      data[offset + 1] = THREE.MathUtils.clamp(75 + shade * 0.72, 0, 255);
      data[offset + 2] = THREE.MathUtils.clamp(54 + shade * 0.48, 0, 255);
      data[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `TEXTURE_HouseShell_${roomId}_WindowFrameWood`;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

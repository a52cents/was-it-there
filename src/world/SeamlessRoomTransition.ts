import * as THREE from 'three';
import type { ExitThresholdDefinition } from '../gameplay/progression/ExitThresholdDetector';
import type { PlayableRoom } from './rooms/PlayableRoom';

export interface DoorwayAnchor {
  readonly center: THREE.Vector3;
  readonly direction: THREE.Vector3;
}

export interface SeamlessRoomPlacement {
  readonly position: THREE.Vector3;
  readonly rotationY: number;
}

export interface OpenRoomEntrance {
  readonly doorway: DoorwayAnchor;
  readonly visualStates: readonly {
    readonly object: THREE.Object3D;
    readonly visible: boolean;
  }[];
  readonly collisionStates: readonly {
    readonly object: THREE.Object3D;
    readonly parent: THREE.Object3D;
  }[];
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const DOORWAY_SEAM_GAP = 0.025;

export function resolveExitDoorway(room: PlayableRoom): DoorwayAnchor {
  const center = getDoorColliderCenter(room, 'exit');
  const thresholdCenter = getThresholdCenter(
    room.getExitThresholdDefinition(),
  );
  const direction = thresholdCenter.sub(center).setY(0);

  if (direction.lengthSq() === 0) {
    throw new Error(
      `Room "${room.definition.id}" exit direction is unavailable.`,
    );
  }

  return {
    center,
    direction: direction.normalize(),
  };
}

export function placeRoomEntranceAtExit(
  room: PlayableRoom,
  exit: DoorwayAnchor,
  preparedEntrance?: DoorwayAnchor,
): SeamlessRoomPlacement {
  const entrance = preparedEntrance ?? resolveEntranceDoorway(room);
  const entranceCenter = entrance.center;
  const spawn = room.getPlayerSpawn();
  const entranceDirection = new THREE.Vector3(
    spawn.x - entranceCenter.x,
    0,
    spawn.z - entranceCenter.z,
  );

  if (entranceDirection.lengthSq() === 0) {
    throw new Error(
      `Room "${room.definition.id}" entrance direction is unavailable.`,
    );
  }

  entranceDirection.normalize();
  const rotationY =
    directionAngle(exit.direction) - directionAngle(entranceDirection);
  const rotatedEntranceCenter = entranceCenter
    .clone()
    .applyAxisAngle(WORLD_UP, rotationY);
  const position = new THREE.Vector3(
    exit.center.x - rotatedEntranceCenter.x,
    0,
    exit.center.z - rotatedEntranceCenter.z,
  ).addScaledVector(exit.direction, DOORWAY_SEAM_GAP);

  if (preparedEntrance === undefined) {
    openRoomEntranceDoor(room, entrance);
  }

  applyRoomPlacement(room, { position, rotationY });
  return { position, rotationY };
}

export function resolveEntranceDoorway(room: PlayableRoom): DoorwayAnchor {
  const center = getDoorColliderCenter(room, 'entrance');
  const spawn = room.getPlayerSpawn();
  const direction = new THREE.Vector3(
    spawn.x - center.x,
    0,
    spawn.z - center.z,
  );

  if (direction.lengthSq() === 0) {
    throw new Error(
      `Room "${room.definition.id}" entrance direction is unavailable.`,
    );
  }

  return {
    center,
    direction: direction.normalize(),
  };
}

export function openRoomEntranceDoor(
  room: PlayableRoom,
  doorway = resolveEntranceDoorway(room),
): OpenRoomEntrance {
  const visualStates = findDoorwayNodes(
    room.getVisualRoot(),
    'entrance',
  ).map((object) => ({
    object,
    visible: object.visible,
  }));
  const collisionStates = findDoorwayNodes(
    room.getCollisionRoot(),
    'entrance',
  ).flatMap((object) => object.parent === null
    ? []
    : [{ object, parent: object.parent }]);

  for (const { object } of visualStates) {
    object.visible = false;
  }

  for (const { object } of collisionStates) {
    object.removeFromParent();
  }

  return {
    doorway,
    visualStates,
    collisionStates,
  };
}

export function restoreRoomEntranceDoor(
  entrance: OpenRoomEntrance,
): void {
  for (const { object, visible } of entrance.visualStates) {
    object.visible = visible;
  }

  for (const { object, parent } of entrance.collisionStates) {
    parent.add(object);
  }
}

export function applyRoomPlacement(
  room: PlayableRoom,
  placement: SeamlessRoomPlacement,
): void {
  for (const root of [room.getVisualRoot(), room.getCollisionRoot()]) {
    root.position.copy(placement.position);
    root.rotation.set(0, placement.rotationY, 0);
    root.updateMatrixWorld(true);
  }
}

export function resetRoomPlacement(room: PlayableRoom): void {
  applyRoomPlacement(room, {
    position: new THREE.Vector3(),
    rotationY: 0,
  });
}

function getDoorColliderCenter(
  room: PlayableRoom,
  doorway: 'entrance' | 'exit',
): THREE.Vector3 {
  const matches = findDoorwayNodes(room.getCollisionRoot(), doorway);
  const collider = matches[0];

  if (collider === undefined) {
    throw new Error(
      `Room "${room.definition.id}" ${doorway} door collider is unavailable.`,
    );
  }

  return new THREE.Box3().setFromObject(collider).getCenter(
    new THREE.Vector3(),
  );
}

function getThresholdCenter(
  threshold: ExitThresholdDefinition,
): THREE.Vector3 {
  if ('x' in threshold) {
    return new THREE.Vector3(
      threshold.x,
      0,
      (threshold.minimumZ + threshold.maximumZ) / 2,
    );
  }

  return new THREE.Vector3(
    (threshold.minimumX + threshold.maximumX) / 2,
    0,
    threshold.z,
  );
}

function findDoorwayNodes(
  root: THREE.Object3D,
  doorway: 'entrance' | 'exit',
): THREE.Object3D[] {
  const matches: THREE.Object3D[] = [];

  root.traverse((object) => {
    const name = normalizeDoorwayName(object.name);

    if (!matchesDoorway(name, doorway)) {
      return;
    }

    let ancestor = object.parent;

    while (ancestor !== null && ancestor !== root) {
      const ancestorName = normalizeDoorwayName(ancestor.name);

      if (matchesDoorway(ancestorName, doorway)) {
        return;
      }

      ancestor = ancestor.parent;
    }

    matches.push(object);
  });
  return matches;
}

function directionAngle(direction: THREE.Vector3): number {
  return Math.atan2(direction.x, direction.z);
}

function normalizeDoorwayName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchesDoorway(
  normalizedName: string,
  doorway: 'entrance' | 'exit',
): boolean {
  if (doorway === 'entrance') {
    return normalizedName.endsWith('ENTRANCE') ||
      normalizedName.endsWith('ENTRANCEDOOR');
  }

  return normalizedName.endsWith('EXIT') ||
    normalizedName.endsWith('EXITDOOR');
}

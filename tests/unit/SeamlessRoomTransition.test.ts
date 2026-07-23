import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  openRoomEntranceDoor,
  placeRoomEntranceAtExit,
  resolveExitDoorway,
  resolveEntranceDoorway,
  resolveRoomPlayerSpawn,
  resetRoomPlacement,
  restoreRoomEntranceDoor,
} from '../../src/world/SeamlessRoomTransition';
import { WorldCollision } from '../../src/world/WorldCollision';
import { GreyboxBathroom } from '../../src/world/rooms/GreyboxBathroom';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { GreyboxCorridor } from '../../src/world/rooms/GreyboxCorridor';
import { GreyboxDiningRoom } from '../../src/world/rooms/GreyboxDiningRoom';
import { GreyboxEntranceCorridor } from '../../src/world/rooms/GreyboxEntranceCorridor';
import { GreyboxKitchen } from '../../src/world/rooms/GreyboxKitchen';
import { GreyboxLaundryRoom } from '../../src/world/rooms/GreyboxLaundryRoom';
import { GreyboxLivingRoom } from '../../src/world/rooms/GreyboxLivingRoom';
import { GreyboxMainHall } from '../../src/world/rooms/GreyboxMainHall';
import { GreyboxOffice } from '../../src/world/rooms/GreyboxOffice';
import type { PlayableRoom } from '../../src/world/rooms/PlayableRoom';

describe('SeamlessRoomTransition', () => {
  it('places the next entrance behind the current exit without a spawn teleport', () => {
    const bedroom = new GreyboxBedroom();
    const bathroom = new GreyboxBathroom();
    bedroom.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });
    bathroom.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });

    const exit = resolveExitDoorway(bedroom);
    const placement = placeRoomEntranceAtExit(bathroom, exit);
    const spawn = bathroom.getPlayerSpawn();
    const worldSpawn = new THREE.Vector3(spawn.x, spawn.y, spawn.z)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY)
      .add(placement.position);
    const directionIntoNextRoom = worldSpawn
      .clone()
      .sub(exit.center)
      .setY(0)
      .normalize();

    expect(exit.direction.x).toBeCloseTo(1);
    expect(exit.direction.z).toBeCloseTo(0);
    expect(directionIntoNextRoom.x).toBeCloseTo(exit.direction.x);
    expect(directionIntoNextRoom.z).toBeCloseTo(exit.direction.z);
    expect(
      bathroom.getCollisionRoot().getObjectByName('COLLIDER_EntranceDoor'),
    ).toBeUndefined();

    resetRoomPlacement(bathroom);
    expect(bathroom.getVisualRoot().position.lengthSq()).toBe(0);
    expect(bathroom.getVisualRoot().rotation.y).toBe(0);

    bedroom.unmount();
    bathroom.unmount();
  });

  it('does not confuse the entrance-corridor room name with its exit door', () => {
    const bedroom = new GreyboxBedroom();
    const entranceCorridor = new GreyboxEntranceCorridor();
    bedroom.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });
    entranceCorridor.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });

    placeRoomEntranceAtExit(
      entranceCorridor,
      resolveExitDoorway(bedroom),
    );

    expect(
      entranceCorridor
        .getCollisionRoot()
        .getObjectByName('COLLIDER_EntranceCorridorEntranceDoor'),
    ).toBeUndefined();
    expect(
      entranceCorridor
        .getCollisionRoot()
        .getObjectByName('COLLIDER_EntranceCorridorExitDoor'),
    ).toBeDefined();

    bedroom.unmount();
    entranceCorridor.unmount();
  });

  it('closes the entrance behind the player after the old room retires', () => {
    const bathroom = new GreyboxBathroom();
    bathroom.mount({
      scene: new THREE.Scene(),
      worldCollision: new WorldCollision(),
    });
    const doorway = resolveEntranceDoorway(bathroom);
    const entrance = openRoomEntranceDoor(bathroom, doorway);

    expect(
      bathroom.getCollisionRoot().getObjectByName('COLLIDER_EntranceDoor'),
    ).toBeUndefined();

    restoreRoomEntranceDoor(entrance);

    expect(
      bathroom.getCollisionRoot().getObjectByName('COLLIDER_EntranceDoor'),
    ).toBeDefined();
    bathroom.unmount();
  });

  it('aligns every consecutive doorway in the ten-room route', () => {
    const roomFactories: readonly (() => PlayableRoom)[] = [
      () => new GreyboxBedroom(),
      () => new GreyboxBathroom(),
      () => new GreyboxCorridor(),
      () => new GreyboxOffice(),
      () => new GreyboxKitchen(),
      () => new GreyboxDiningRoom(),
      () => new GreyboxLivingRoom(),
      () => new GreyboxLaundryRoom(),
      () => new GreyboxEntranceCorridor(),
      () => new GreyboxMainHall(),
    ];

    for (let index = 0; index < roomFactories.length - 1; index += 1) {
      const currentRoom = roomFactories[index]?.();
      const nextRoom = roomFactories[index + 1]?.();

      if (currentRoom === undefined || nextRoom === undefined) {
        throw new Error(`Missing room factory at route index ${index}.`);
      }

      currentRoom.mount({
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
      });
      nextRoom.mount({
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
      });
      const exit = resolveExitDoorway(currentRoom);
      const placement = placeRoomEntranceAtExit(nextRoom, exit);
      const spawn = nextRoom.getPlayerSpawn();
      const directionIntoNextRoom = new THREE.Vector3(
        spawn.x,
        spawn.y,
        spawn.z,
      )
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY)
        .add(placement.position)
        .sub(exit.center)
        .setY(0)
        .normalize();

      expect(directionIntoNextRoom.dot(exit.direction)).toBeCloseTo(1);

      currentRoom.unmount();
      nextRoom.unmount();
    }
  });

  it('keeps chained rooms, exits and player spawns in world space', () => {
    const bedroom = new GreyboxBedroom();
    const bathroom = new GreyboxBathroom();
    const corridor = new GreyboxCorridor();

    for (const room of [bedroom, bathroom, corridor]) {
      room.mount({
        scene: new THREE.Scene(),
        worldCollision: new WorldCollision(),
      });
    }

    const bedroomExit = resolveExitDoorway(bedroom);
    const bathroomPlacement = placeRoomEntranceAtExit(
      bathroom,
      bedroomExit,
    );
    const bathroomSpawn = resolveRoomPlayerSpawn(bathroom);
    const expectedBathroomSpawn = bathroom.getPlayerSpawn();
    const expectedWorldSpawn = new THREE.Vector3(
      expectedBathroomSpawn.x,
      expectedBathroomSpawn.y,
      expectedBathroomSpawn.z,
    )
      .applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        bathroomPlacement.rotationY,
      )
      .add(bathroomPlacement.position);

    expect(bathroomSpawn.x).toBeCloseTo(expectedWorldSpawn.x);
    expect(bathroomSpawn.z).toBeCloseTo(expectedWorldSpawn.z);

    const bathroomExit = resolveExitDoorway(bathroom);
    const corridorPlacement = placeRoomEntranceAtExit(
      corridor,
      bathroomExit,
    );
    const corridorSpawn = resolveRoomPlayerSpawn(corridor);
    const directionIntoCorridor = new THREE.Vector3(
      corridorSpawn.x,
      corridorSpawn.y,
      corridorSpawn.z,
    )
      .sub(bathroomExit.center)
      .setY(0)
      .normalize();

    expect(directionIntoCorridor.dot(bathroomExit.direction)).toBeCloseTo(1);
    expect(corridorPlacement.position.lengthSq()).toBeGreaterThan(0);

    bedroom.unmount();
    bathroom.unmount();
    corridor.unmount();
  });
});

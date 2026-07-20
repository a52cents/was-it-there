import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WorldCollision } from '../../src/world/WorldCollision';
import { GreyboxBathroom } from '../../src/world/rooms/GreyboxBathroom';
import { GreyboxBedroom } from '../../src/world/rooms/GreyboxBedroom';
import { GreyboxCorridor } from '../../src/world/rooms/GreyboxCorridor';
import { GreyboxDiningRoom } from '../../src/world/rooms/GreyboxDiningRoom';
import { GreyboxKitchen } from '../../src/world/rooms/GreyboxKitchen';
import { GreyboxOffice } from '../../src/world/rooms/GreyboxOffice';

describe('room lighting consistency', () => {
  it.each([
    [new GreyboxBedroom(), 'LIGHT_Ambient', 'LIGHT_RoomBounce', 'LIGHT_Ceiling'],
    [
      new GreyboxBathroom(),
      'LIGHT_Bathroom_Ambient',
      'LIGHT_Bathroom_Bounce',
      'LIGHT_Bathroom_Ceiling',
    ],
    [
      new GreyboxCorridor(),
      'LIGHT_Corridor_Ambient',
      'LIGHT_Corridor_Bounce',
      'LIGHT_Corridor_Key',
    ],
    [
      new GreyboxOffice(),
      'LIGHT_Office_Ambient',
      'LIGHT_Office_Bounce',
      'LIGHT_Office_Key',
    ],
    [
      new GreyboxKitchen(),
      'LIGHT_Kitchen_Ambient',
      'LIGHT_Kitchen_Bounce',
      'LIGHT_Kitchen_Key',
    ],
    [
      new GreyboxDiningRoom(),
      'LIGHT_DiningRoom_Ambient',
      'LIGHT_DiningRoom_Bounce',
      'LIGHT_DiningRoom_Table',
    ],
  ])(
    '%s shares the validated ambient and key-light balance',
    (room, hemisphereName, ambientName, keyName) => {
      room.mount({ scene: new THREE.Scene(), worldCollision: new WorldCollision() });
      const root = room.getVisualRoot();
      const hemisphere = root.getObjectByName(hemisphereName) as THREE.HemisphereLight;
      const ambient = root.getObjectByName(ambientName) as THREE.AmbientLight;
      const key = root.getObjectByName(keyName) as THREE.SpotLight;

      expect(hemisphere.color.getHex()).toBe(0x94a1a5);
      expect(hemisphere.groundColor.getHex()).toBe(0x3b2d26);
      expect(hemisphere.intensity).toBeCloseTo(0.4);
      expect(ambient.color.getHex()).toBe(0xc8c0b3);
      expect(ambient.intensity).toBeCloseTo(0.12);
      expect(key.intensity).toBeCloseTo(6.4);
      expect(key.castShadow).toBe(true);
      room.unmount();
    },
  );
});

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { RoomStateSnapshot } from '../../src/world/assets/RoomStateSnapshot';

describe('RoomStateSnapshot', () => {
  it('restores hierarchy, transforms, visibility, materials, and lights', () => {
    const root = new THREE.Group();
    const target = new THREE.Group();
    target.name = 'ANOM_Lamp';
    target.position.set(1, 2, 3);
    const material = new THREE.MeshStandardMaterial({
      color: 0x336699,
      emissive: 0x110000,
      opacity: 0.8,
      transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.name = 'Lamp_Shade';
    const light = new THREE.PointLight(0xffddaa, 2.5);
    light.name = 'LIGHT_Lamp';
    target.add(mesh, light);
    root.add(target);
    const snapshot = new RoomStateSnapshot(root);
    const replacementMaterial = new THREE.MeshStandardMaterial();
    const extra = new THREE.Group();
    extra.name = 'ANOM_Duplicate';

    target.removeFromParent();
    target.name = 'Changed';
    target.position.set(9, 9, 9);
    target.visible = false;
    target.layers.set(2);
    mesh.material = replacementMaterial;
    material.color.set(0xff0000);
    material.emissive.set(0x00ff00);
    material.opacity = 0.1;
    material.transparent = false;
    light.color.set(0x0000ff);
    light.intensity = 0;
    root.add(extra);

    snapshot.restore();

    expect(target.parent).toBe(root);
    expect(extra.parent).toBeNull();
    expect(target.name).toBe('ANOM_Lamp');
    expect(target.position.toArray()).toEqual([1, 2, 3]);
    expect(target.visible).toBe(true);
    expect(target.layers.mask).toBe(1);
    expect(mesh.material).toBe(material);
    expect(material.color.getHex()).toBe(0x336699);
    expect(material.emissive.getHex()).toBe(0x110000);
    expect(material.opacity).toBeCloseTo(0.8);
    expect(material.transparent).toBe(true);
    expect(light.color.getHex()).toBe(0xffddaa);
    expect(light.intensity).toBeCloseTo(2.5);
  });
});

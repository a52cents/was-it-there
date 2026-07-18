import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SceneNodeIndex } from '../../src/world/assets/SceneNodeIndex';

describe('SceneNodeIndex', () => {
  it('resolves nodes and shared named materials without using child order', () => {
    const root = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    material.name = 'MAT_Wood';
    const second = new THREE.Mesh(new THREE.BoxGeometry(), material);
    second.name = 'ANOM_Second';
    const first = new THREE.Mesh(new THREE.BoxGeometry(), material);
    first.name = 'ANOM_First';
    root.add(second, first);
    const index = new SceneNodeIndex(root, 'bedroom');

    expect(index.requireNode('ANOM_First')).toBe(first);
    expect(index.requireMesh('ANOM_Second')).toBe(second);
    expect(index.requireMaterial('MAT_Wood')).toBe(material);
  });

  it('reports missing required names with room context', () => {
    const index = new SceneNodeIndex(new THREE.Group(), 'bedroom');

    expect(() => index.requireNode('EXIT_Door', 'exit door')).toThrow(
      'Room asset "bedroom" is missing required exit door "EXIT_Door".',
    );
  });

  it('rejects ambiguous node names', () => {
    const root = new THREE.Group();
    const first = new THREE.Group();
    const second = new THREE.Group();
    first.name = 'ANOM_Chair';
    second.name = 'ANOM_Chair';
    root.add(first, second);
    const index = new SceneNodeIndex(root, 'bedroom');

    expect(() => index.requireNode('ANOM_Chair')).toThrow(
      'Room asset "bedroom" contains 2 objects named "ANOM_Chair"; node names must be unique.',
    );
  });

  it('rejects a non-mesh node requested as a mesh', () => {
    const root = new THREE.Group();
    const group = new THREE.Group();
    group.name = 'INTERACT_Television';
    root.add(group);
    const index = new SceneNodeIndex(root, 'bedroom');

    expect(() => index.requireMesh(group.name, 'interaction volume')).toThrow(
      'Room asset "bedroom" requires "INTERACT_Television" to be a mesh for interaction volume.',
    );
  });
});

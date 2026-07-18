import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  LEVEL_BUILDER_FORMAT_VERSION,
  applyLevelBuilderObjectState,
  captureLevelBuilderObjectState,
  createLevelBuilderObjectReference,
  parseLevelBuilderDocument,
  resolveLevelBuilderObjectReference,
  serializeLevelBuilderDocument,
  validateLevelBuilderVariant,
  type LevelBuilderVariantDefinition,
  type LevelBuilderVariantKind,
} from '../../src/debug/level-builder/LevelBuilderDocument';
import { LevelBuilderSession } from '../../src/debug/level-builder/LevelBuilderSession';
import { serializeLevelBuilderLayoutDocument } from '../../src/debug/level-builder/LevelBuilderLayoutDocument';

function createSceneGraph() {
  const root = new THREE.Group();
  root.name = 'ROOM_Visual';
  const firstChair = new THREE.Group();
  firstChair.name = 'Chair';
  const secondChair = new THREE.Group();
  secondChair.name = 'Chair';
  const material = new THREE.MeshStandardMaterial({ color: 0x884422 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = 'Seat';
  secondChair.add(mesh);
  root.add(firstChair, secondChair);
  return { root, firstChair, secondChair, mesh, material };
}

describe('Level Builder document', () => {
  it('creates stable name-and-occurrence paths through duplicate siblings', () => {
    const { root, secondChair, mesh } = createSceneGraph();
    const chairReference = createLevelBuilderObjectReference(
      root,
      secondChair,
      'chair',
    );
    const meshReference = createLevelBuilderObjectReference(root, mesh);

    expect(chairReference.path).toEqual([
      { name: 'Chair', occurrence: 1 },
    ]);
    expect(chairReference.anomalyTargetId).toBe('chair');
    expect(resolveLevelBuilderObjectReference(root, chairReference)).toBe(
      secondChair,
    );
    expect(resolveLevelBuilderObjectReference(root, meshReference)).toBe(mesh);
  });

  it('captures and restores transforms, visibility, and material colors', () => {
    const { secondChair, material } = createSceneGraph();
    const before = captureLevelBuilderObjectState(secondChair);
    secondChair.position.set(2, 3, 4);
    secondChair.rotation.y = 0.75;
    secondChair.scale.setScalar(1.5);
    secondChair.visible = false;
    material.color.set(0x225588);

    applyLevelBuilderObjectState(secondChair, before);

    expect(secondChair.position.toArray()).toEqual([0, 0, 0]);
    expect(secondChair.quaternion.toArray()).toEqual([0, 0, 0, 1]);
    expect(secondChair.scale.toArray()).toEqual([1, 1, 1]);
    expect(secondChair.visible).toBe(true);
    expect(material.color.getHex()).toBe(0x884422);
  });

  it.each([
    'show',
    'hide',
    'move',
    'rotate',
    'scale',
    'color',
  ] as const)('validates a captured %s change', (kind) => {
    const variant = createChangedVariant(kind);

    expect(validateLevelBuilderVariant(variant)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('round-trips valid JSON and rejects invalid or duplicate variants', () => {
    const variant = createChangedVariant('move');
    const document = {
      formatVersion: LEVEL_BUILDER_FORMAT_VERSION,
      roomId: 'greybox-bedroom',
      variants: [variant],
    } as const;
    const serialized = serializeLevelBuilderDocument(document);

    expect(parseLevelBuilderDocument(serialized)).toEqual(document);
    expect(() =>
      parseLevelBuilderDocument(
        JSON.stringify({ ...document, formatVersion: 99 }),
      ),
    ).toThrow('Unsupported Level Builder format');
    expect(() =>
      parseLevelBuilderDocument(
        JSON.stringify({ ...document, variants: [variant, variant] }),
      ),
    ).toThrow('Duplicate Level Builder variant id');
  });

  it('manages before/after previews and imports only the current room', () => {
    const { root, secondChair } = createSceneGraph();
    const session = new LevelBuilderSession(
      'greybox-bedroom',
      root,
      (object) => (object === secondChair ? 'chair' : undefined),
    );
    session.select(secondChair);
    secondChair.position.x = 2;

    expect(session.saveVariant('chair-moved', 'move').valid).toBe(true);
    session.previewBefore();
    expect(secondChair.position.x).toBe(0);
    session.previewAfter();
    expect(secondChair.position.x).toBe(2);

    const serialized = serializeLevelBuilderDocument(session.createDocument());
    const imported = new LevelBuilderSession(
      'greybox-bedroom',
      root,
      () => undefined,
    );
    imported.importDocument(parseLevelBuilderDocument(serialized));
    expect(imported.getVariants()).toHaveLength(1);
    expect(() =>
      imported.importDocument({
        ...session.createDocument(),
        roomId: 'kitchen',
      }),
    ).toThrow('expected "greybox-bedroom"');
  });

  it('exports every registered target current transform as a stable room layout', () => {
    const { root, firstChair, secondChair } = createSceneGraph();
    firstChair.position.set(-1, 0.25, 3);
    secondChair.position.set(2, 0.5, -4);
    secondChair.rotation.y = Math.PI / 3;
    secondChair.scale.set(1.2, 1.4, 0.8);
    secondChair.visible = false;
    const session = new LevelBuilderSession(
      'bathroom',
      root,
      (object) => {
        if (object === firstChair) {
          return 'z-chair';
        }

        return object === secondChair ? 'a-chair' : undefined;
      },
    );

    const document = session.createLayoutDocument();

    expect(document).toMatchObject({
      formatVersion: 1,
      documentType: 'room-layout',
      roomId: 'bathroom',
    });
    expect(document.objects.map((object) => object.targetId)).toEqual([
      'a-chair',
      'z-chair',
    ]);
    expect(document.objects[0]).toMatchObject({
      nodeName: 'Chair',
      position: [2, 0.5, -4],
      scale: [1.2, 1.4, 0.8],
      visible: false,
    });
    expect(document.objects[0]?.quaternion).toEqual(
      secondChair.quaternion.toArray(),
    );
    expect(JSON.parse(serializeLevelBuilderLayoutDocument(document))).toEqual(
      document,
    );
  });
});

function createChangedVariant(
  kind: LevelBuilderVariantKind,
): LevelBuilderVariantDefinition {
  const { root, secondChair, material } = createSceneGraph();

  if (kind === 'show') {
    secondChair.visible = false;
  }

  const before = captureLevelBuilderObjectState(secondChair);

  switch (kind) {
    case 'show':
      secondChair.visible = true;
      break;
    case 'hide':
      secondChair.visible = false;
      break;
    case 'move':
      secondChair.position.x = 1;
      break;
    case 'rotate':
      secondChair.rotation.y = 0.5;
      break;
    case 'scale':
      secondChair.scale.setScalar(1.2);
      break;
    case 'color':
      material.color.set(0x336699);
      break;
  }

  return {
    id: `chair-${kind}`,
    kind,
    target: createLevelBuilderObjectReference(root, secondChair, 'chair'),
    before,
    after: captureLevelBuilderObjectState(secondChair),
  };
}

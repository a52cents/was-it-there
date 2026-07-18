import * as THREE from 'three';
import { RENDER_LAYERS } from '../../rendering/RenderLayers';

export const ANOMALY_KINDS = [
  'hide',
  'show',
  'move',
  'rotate',
  'scale',
  'color',
  'material',
  'toggle-light',
  'toggle-open',
  'duplicate',
] as const;

export type AnomalyKind = (typeof ANOMALY_KINDS)[number];

export type SnapshotVector3 = readonly [number, number, number];
export type SnapshotQuaternion = readonly [number, number, number, number];
export type SnapshotColor = readonly [number, number, number];

export const RESTORE_CANONICAL_COLORS_VARIANT_ID =
  'restored-base-color';

export interface HideAnomalyVariant {
  readonly id: string;
  readonly kind: 'hide';
}

export interface ShowAnomalyVariant {
  readonly id: string;
  readonly kind: 'show';
}

export interface MoveAnomalyVariant {
  readonly id: string;
  readonly kind: 'move';
  readonly positionOffset: SnapshotVector3;
}

export interface RotationAnomalyVariant {
  readonly id: string;
  readonly kind: 'rotate';
  readonly rotationOffsetRadians: SnapshotVector3;
}

export interface ScaleAnomalyVariant {
  readonly id: string;
  readonly kind: 'scale';
  readonly scaleMultiplier: SnapshotVector3;
}

export interface AnomalyNodePathSegment {
  readonly name: string;
  readonly occurrence: number;
}

export interface AnomalyMaterialColorChange {
  readonly nodePath: readonly AnomalyNodePathSegment[];
  readonly materialIndex: number;
  readonly color: string;
}

export interface ColorAnomalyVariant {
  readonly id: string;
  readonly kind: 'color';
  readonly nodeNames: readonly string[];
  readonly materialNames?: readonly string[];
  readonly color: string;
  readonly materialColorChanges?: readonly AnomalyMaterialColorChange[];
  readonly restoresCanonicalColors?: true;
}

export type PreparedAnomalyVariant =
  | HideAnomalyVariant
  | ShowAnomalyVariant
  | MoveAnomalyVariant
  | RotationAnomalyVariant
  | ScaleAnomalyVariant
  | ColorAnomalyVariant;

export interface AnomalyMaterialSnapshot {
  readonly material: THREE.Material;
  readonly color: SnapshotColor | null;
}

export interface AnomalyNodeSnapshot {
  readonly node: THREE.Object3D;
  readonly position: SnapshotVector3;
  readonly quaternion: SnapshotQuaternion;
  readonly scale: SnapshotVector3;
  readonly visible: boolean;
  readonly materialWasArray: boolean;
  readonly materials: readonly AnomalyMaterialSnapshot[];
}

export interface AnomalyTargetInitialState {
  readonly nodes: readonly AnomalyNodeSnapshot[];
}

export interface AnomalyCollisionObjectSnapshot {
  readonly node: THREE.Object3D;
  readonly parent: THREE.Object3D;
  readonly position: SnapshotVector3;
  readonly quaternion: SnapshotQuaternion;
  readonly scale: SnapshotVector3;
  readonly visible: boolean;
}

export interface AnomalyTargetDefinition {
  readonly id: string;
  readonly nodeName: string;
  readonly interactionNodeNames: readonly string[];
  readonly allowedKinds: readonly AnomalyKind[];
  readonly variants: readonly PreparedAnomalyVariant[];
  readonly weight: number;
  readonly minimumDifficulty: number;
}

export interface AnomalyTarget extends AnomalyTargetDefinition {
  readonly object: THREE.Object3D;
  readonly interactionVolume: THREE.Mesh;
  readonly interactionVolumes: readonly THREE.Mesh[];
  readonly dependentTargetIds?: readonly string[];
  readonly initialState: AnomalyTargetInitialState;
  readonly collisionObjects?: readonly THREE.Object3D[];
  readonly collisionInitialState?: readonly AnomalyCollisionObjectSnapshot[];
}

export function captureAnomalyTargetInitialState(
  root: THREE.Object3D,
): AnomalyTargetInitialState {
  const nodes: AnomalyNodeSnapshot[] = [];

  root.traverse((node) => {
    if (!node.layers.isEnabled(RENDER_LAYERS.scene)) {
      return;
    }

    const mesh = node as THREE.Mesh;
    const materials = mesh.isMesh
      ? getMaterials(mesh.material).map(captureMaterial)
      : [];

    nodes.push({
      node,
      position: [node.position.x, node.position.y, node.position.z],
      quaternion: [
        node.quaternion.x,
        node.quaternion.y,
        node.quaternion.z,
        node.quaternion.w,
      ],
      scale: [node.scale.x, node.scale.y, node.scale.z],
      visible: node.visible,
      materialWasArray: mesh.isMesh && Array.isArray(mesh.material),
      materials,
    });
  });

  return { nodes };
}

export function restoreAnomalyTargetInitialState(
  initialState: AnomalyTargetInitialState,
): void {
  for (const snapshot of initialState.nodes) {
    const { node } = snapshot;
    node.position.fromArray(snapshot.position);
    node.quaternion.fromArray(snapshot.quaternion);
    node.scale.fromArray(snapshot.scale);
    node.visible = snapshot.visible;

    const mesh = node as THREE.Mesh;

    if (mesh.isMesh && snapshot.materials.length > 0) {
      const materials = snapshot.materials.map(
        (materialSnapshot) => materialSnapshot.material,
      );
      mesh.material = snapshot.materialWasArray
        ? materials
        : (materials[0] as THREE.Material);
    }

    for (const materialSnapshot of snapshot.materials) {
      const color = (
        materialSnapshot.material as THREE.Material & {
          color?: THREE.Color;
        }
      ).color;

      if (color?.isColor === true && materialSnapshot.color !== null) {
        color.fromArray(materialSnapshot.color);
      }
    }
  }
}

export function captureAnomalyCollisionObjectState(
  objects: readonly THREE.Object3D[],
): readonly AnomalyCollisionObjectSnapshot[] {
  return objects.map((node) => {
    const parent = node.parent;

    if (parent === null) {
      throw new Error(
        `Anomaly collision object "${node.name}" must have a parent when captured.`,
      );
    }

    return {
      node,
      parent,
      position: [node.position.x, node.position.y, node.position.z],
      quaternion: [
        node.quaternion.x,
        node.quaternion.y,
        node.quaternion.z,
        node.quaternion.w,
      ],
      scale: [node.scale.x, node.scale.y, node.scale.z],
      visible: node.visible,
    };
  });
}

export function restoreAnomalyCollisionObjectState(
  snapshots: readonly AnomalyCollisionObjectSnapshot[],
): void {
  for (const snapshot of snapshots) {
    if (snapshot.node.parent !== snapshot.parent) {
      snapshot.parent.add(snapshot.node);
    }

    snapshot.node.position.fromArray(snapshot.position);
    snapshot.node.quaternion.fromArray(snapshot.quaternion);
    snapshot.node.scale.fromArray(snapshot.scale);
    snapshot.node.visible = snapshot.visible;
    snapshot.node.updateMatrixWorld(true);
  }
}

function getMaterials(
  material: THREE.Material | THREE.Material[],
): readonly THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function captureMaterial(material: THREE.Material): AnomalyMaterialSnapshot {
  const color = (material as THREE.Material & { color?: THREE.Color }).color;

  return {
    material,
    color:
      color?.isColor === true ? [color.r, color.g, color.b] : null,
  };
}

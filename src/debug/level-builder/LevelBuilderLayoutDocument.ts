import type { LevelBuilderObjectReference } from './LevelBuilderDocument';

export const LEVEL_BUILDER_LAYOUT_FORMAT_VERSION = 2 as const;

export interface LevelBuilderLayoutObject {
  readonly targetId: string;
  readonly nodeName: string;
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly visible: boolean;
}

export interface LevelBuilderLayoutAddition {
  readonly id: string;
  readonly source: LevelBuilderObjectReference;
  readonly nodeName: string;
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
  readonly scale: readonly [number, number, number];
  readonly visible: boolean;
}

export interface LevelBuilderLayoutDocument {
  readonly formatVersion: typeof LEVEL_BUILDER_LAYOUT_FORMAT_VERSION;
  readonly documentType: 'room-layout';
  readonly roomId: string;
  readonly objects: readonly LevelBuilderLayoutObject[];
  readonly additions: readonly LevelBuilderLayoutAddition[];
}

export function serializeLevelBuilderLayoutDocument(
  document: LevelBuilderLayoutDocument,
): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

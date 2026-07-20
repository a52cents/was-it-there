export const FIRST_CHAPTER_CORE_FRAGMENT_IDS = [
  'memory-empty-place',
  'memory-mirror-warning',
  'memory-phone-prediction',
  'memory-erased-name',
  'memory-kitchen-fourth-place',
  'memory-dining-reconstruction',
] as const;

export const FIRST_STORY_CHAPTER_FINAL_ROOM_ID = 'dining-room';
export const CURRENT_STORY_ROUTE_FINAL_ROOM_ID = 'main-hall';

export type StoryChapterOutcome =
  | 'chapter-escaped'
  | 'chapter-remembered'
  | 'chapter-two-recording'
  | 'chapter-two-copies'
  | 'ending-escape'
  | 'ending-remember'
  | 'ending-replaced';

export function resolveFirstChapterOutcome(
  fragmentIds: readonly string[],
): StoryChapterOutcome {
  const fragments = new Set(fragmentIds);
  return FIRST_CHAPTER_CORE_FRAGMENT_IDS.every((id) => fragments.has(id))
    ? 'chapter-remembered'
    : 'chapter-escaped';
}

export function isFirstStoryChapterFinalRoom(roomId: string): boolean {
  return roomId === FIRST_STORY_CHAPTER_FINAL_ROOM_ID;
}

export function isCurrentStoryRouteFinalRoom(roomId: string): boolean {
  return roomId === CURRENT_STORY_ROUTE_FINAL_ROOM_ID;
}

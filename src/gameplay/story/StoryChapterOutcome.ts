export const FIRST_CHAPTER_CORE_FRAGMENT_IDS = [
  'memory-empty-place',
  'memory-mirror-warning',
  'memory-phone-prediction',
  'memory-erased-name',
] as const;

export const FIRST_STORY_CHAPTER_FINAL_ROOM_ID = 'kitchen';

export type StoryChapterOutcome = 'chapter-escaped' | 'chapter-remembered';

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

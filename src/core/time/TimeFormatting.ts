function getSafeMilliseconds(milliseconds: number): number {
  return Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0;
}

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatElapsedMilliseconds(milliseconds: number): string {
  const totalSeconds = Math.floor(getSafeMilliseconds(milliseconds) / 1_000);
  return formatSeconds(totalSeconds);
}

export function formatRemainingMilliseconds(milliseconds: number): string {
  const totalSeconds = Math.ceil(getSafeMilliseconds(milliseconds) / 1_000);
  return formatSeconds(totalSeconds);
}

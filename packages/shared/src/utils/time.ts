export function formatCompactDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');
    if (seconds > 0) return `${hours}h${paddedMinutes}min${paddedSeconds}s`;
    if (minutes > 0) return `${hours}h${paddedMinutes}min`;
    return `${hours}h`;
  }

  if (minutes > 0) {
    if (seconds > 0) return `${minutes}min${seconds.toString().padStart(2, '0')}s`;
    return `${minutes}min`;
  }

  return `${seconds}s`;
}

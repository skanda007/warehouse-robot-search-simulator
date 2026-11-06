/** Playback timing. Search steps adapt to the event count so long searches stay watchable. */
export const EXEC_MS = 420; // one robot cell at 1x
export const HOLD_MS = 900; // pause on "Goal Found" before the robot leaves the dock

export function searchBaseMs(events: number): number {
  if (events <= 80) return 260;
  if (events <= 300) return 110;
  if (events <= 800) return 45;
  return 22;
}

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

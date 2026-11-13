/** Keyboard map for the player. Pure, so it is unit-tested without a browser. */
export type PlayerAction =
  | { type: "toggle-play" }
  | { type: "seek-by"; seconds: number }
  | { type: "seek-percent"; percent: number }
  | { type: "seek-start" }
  | { type: "seek-end" }
  | { type: "volume-by"; delta: number }
  | { type: "toggle-mute" }
  | { type: "toggle-fullscreen" }
  | { type: "toggle-captions" };

export type KeyInfo = { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean };

export const SEEK_SMALL = 5;
export const SEEK_LARGE = 10;
export const VOLUME_STEP = 0.05;

/** Returns null for keys the player does not handle (and for any Ctrl/Meta/Alt combination, so browser shortcuts work). */
export function mapKey(e: KeyInfo): PlayerAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case " ":
    case "Spacebar":
    case "k":
    case "K":
      return { type: "toggle-play" };
    case "ArrowLeft":
      return { type: "seek-by", seconds: -SEEK_SMALL };
    case "ArrowRight":
      return { type: "seek-by", seconds: SEEK_SMALL };
    case "j":
    case "J":
      return { type: "seek-by", seconds: -SEEK_LARGE };
    case "l":
    case "L":
      return { type: "seek-by", seconds: SEEK_LARGE };
    case "ArrowUp":
      return { type: "volume-by", delta: VOLUME_STEP };
    case "ArrowDown":
      return { type: "volume-by", delta: -VOLUME_STEP };
    case "m":
    case "M":
      return { type: "toggle-mute" };
    case "f":
    case "F":
      return { type: "toggle-fullscreen" };
    case "c":
    case "C":
      return { type: "toggle-captions" };
    case "Home":
      return { type: "seek-start" };
    case "End":
      return { type: "seek-end" };
    default:
      if (/^[0-9]$/.test(e.key)) return { type: "seek-percent", percent: Number(e.key) * 10 };
      return null;
  }
}

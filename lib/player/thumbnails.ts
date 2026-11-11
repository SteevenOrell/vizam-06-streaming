/** WebVTT thumbnail track ("sprite.jpg#xywh=0,0,160,90" per cue) used for the scrub preview. */
export type ThumbCue = { start: number; end: number; url: string; x: number; y: number; w: number; h: number };

function parseTimestamp(s: string): number | null {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/.exec(s.trim());
  if (!m) return null;
  const ms = m[4] ? Number(m[4].padEnd(3, "0")) : 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + ms / 1000;
}

/** Parses the VTT text. `baseUrl` is the VTT's own absolute URL, used to resolve relative sprite paths (local only). */
export function parseThumbnailVtt(text: string, baseUrl: string): ThumbCue[] {
  const cues: ThumbCue[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const timing = lines.findIndex((l) => l.includes("-->"));
    if (timing < 0 || !lines[timing + 1]) continue;
    const [a, b] = lines[timing].split("-->");
    const start = parseTimestamp(a);
    const end = parseTimestamp(b.trim().split(/\s+/)[0]);
    const target = lines[timing + 1];
    const hash = target.indexOf("#xywh=");
    if (start === null || end === null || hash < 0) continue;
    const [x, y, w, h] = target
      .slice(hash + 6)
      .split(",")
      .map(Number);
    if ([x, y, w, h].some((n) => !Number.isFinite(n)) || w <= 0 || h <= 0) continue;
    try {
      cues.push({ start, end, url: new URL(target.slice(0, hash), baseUrl).pathname, x, y, w, h });
    } catch {
      /* bad sprite path */
    }
  }
  return cues;
}

export function findThumb(cues: readonly ThumbCue[], time: number): ThumbCue | undefined {
  const hit = cues.find((c) => time >= c.start && time < c.end);
  if (hit) return hit;
  const last = cues[cues.length - 1];
  return last && time >= last.end ? last : undefined;
}

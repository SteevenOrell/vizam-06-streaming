export type SourceLike = { url: string; type: string };

/**
 * Orders the playable candidates for a video. The content list is best quality first (1080p, then 480p).
 * - Drops entries the browser says it cannot play (`canPlay(type)` false).
 * - Keeps the authored order normally, so the player tries the next candidate when one fails.
 * - With `dataSaver`, the smallest (last playable) entry goes first, then the rest in authored order.
 */
export function orderSources<T extends SourceLike>(list: readonly T[], canPlay: (type: string) => boolean, dataSaver: boolean): T[] {
  const playable = list.filter((s) => canPlay(s.type));
  if (!dataSaver || playable.length < 2) return playable;
  const last = playable[playable.length - 1];
  return [last, ...playable.slice(0, -1)];
}

/** Default for the data-saver toggle when the visitor has not chosen: Save-Data or a narrow screen. */
export function defaultDataSaver(opts: { saveData: boolean; viewportWidth: number }): boolean {
  return opts.saveData || opts.viewportWidth <= 640;
}

export function browserCanPlay(video: Pick<HTMLVideoElement, "canPlayType">) {
  return (type: string) => video.canPlayType(type) !== "";
}

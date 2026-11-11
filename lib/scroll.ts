/**
 * Eased horizontal scroll for carousels (cubic ease-out, same feel as --ease-cinema). Scroll-snap is switched off while
 * the tween runs and restored at the end, then the browser settles on the nearest snap point. Instant when reduced.
 */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

export function scrollToEased(el: HTMLElement, left: number, reduced: boolean, duration = 560): void {
  const max = el.scrollWidth - el.clientWidth;
  const target = Math.max(0, Math.min(max, left));
  if (reduced || duration <= 0 || Math.abs(target - el.scrollLeft) < 2) {
    el.scrollTo({ left: target, behavior: "auto" });
    return;
  }
  const from = el.scrollLeft;
  const prevSnap = el.style.scrollSnapType;
  el.style.scrollSnapType = "none";
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    el.scrollLeft = from + (target - from) * easeOut(t);
    if (t < 1) requestAnimationFrame(step);
    else el.style.scrollSnapType = prevSnap;
  };
  requestAnimationFrame(step);
}

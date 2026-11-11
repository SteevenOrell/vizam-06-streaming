/**
 * Motion presets shared by Motion (motion/react) components. Pair with `usePrefersReducedMotion()` or Motion's
 * `<MotionConfig reducedMotion="user">` (set in app/providers.tsx) so reduced-motion visitors get instant changes.
 */
export const ease = {
  cinema: [0.16, 1, 0.3, 1] as const,
  swift: [0.4, 0, 0.2, 1] as const,
};

export const duration = { fast: 0.16, base: 0.26, slow: 0.48 } as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.slow, ease: ease.cinema },
} as const;

/** Returns a no-op variant set when reduced motion is requested. */
export function motionSafe<T extends object>(reduced: boolean, preset: T): T | Record<string, never> {
  return reduced ? {} : preset;
}

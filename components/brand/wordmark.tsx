import { useId } from "react";

/**
 * AFTERLIGHT mark: a sun just below the horizon, its last light breaking into three bands.
 * Original artwork (VIZAM). The wordmark is live text in the display face so it stays crisp and accessible.
 */
export function AfterlightMark({ className = "h-6 w-6" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBD9A8" />
          <stop offset="0.55" stopColor="#F2A33A" />
          <stop offset="1" stopColor="#B86A12" />
        </linearGradient>
      </defs>
      <path d="M5 19a11 11 0 0 1 22 0Z" fill={`url(#${id}-g)`} />
      <rect x="3" y="21.5" width="26" height="2" rx="1" fill="#F2A33A" />
      <rect x="7" y="25.5" width="18" height="2" rx="1" fill="#F2A33A" opacity="0.6" />
      <rect x="11" y="29" width="10" height="1.6" rx="0.8" fill="#F2A33A" opacity="0.3" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <AfterlightMark className="h-7 w-7 shrink-0" />
      <span className="display text-[1.65rem] leading-none tracking-[0.06em] text-bone-50">
        After<span className="text-ember-400">light</span>
      </span>
    </span>
  );
}

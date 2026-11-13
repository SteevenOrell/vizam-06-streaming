"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  id: string;
  label: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buttonClassName: string;
  /** Visual "on" state for the trigger (e.g. captions showing). */
  pressed?: boolean;
  testId?: string;
  children: ReactNode;
};

/**
 * Disclosure popover for the control bar: a button with `aria-expanded` and a panel of toggle buttons.
 * Escape closes it and returns focus to the trigger; a click outside closes it.
 */
export function PlayerMenu({ id, label, icon, open, onOpenChange, buttonClassName, pressed, testId, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-menu={id}
        data-testid={testId}
        onClick={() => onOpenChange(!open)}
        className={`${buttonClassName} ${pressed ? "text-ember-300" : ""}`}
      >
        {icon}
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute bottom-full right-0 z-10 mb-3 max-h-[60vh] min-w-48 overflow-y-auto rounded-card bg-ink-900/95 p-1.5 shadow-lift ring-1 ring-white/10 backdrop-blur-md"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

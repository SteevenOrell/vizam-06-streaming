"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { mainNav } from "@/lib/site";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close the menu when the route changes (state adjustment during render, no effect needed).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Focus trap, Escape and scroll lock while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [toggleRef.current, ...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el): el is HTMLElement => Boolean(el),
      );
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <header
      data-scrolled={scrolled || open}
      className="group/header sticky top-0 z-50 h-[var(--header-h)]"
    >
      {/* Blur lives on a sibling layer: backdrop-filter on <header> would trap the fixed mobile menu inside it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 border-b border-transparent bg-gradient-to-b from-ink-950/70 to-transparent transition-colors duration-300 group-data-[scrolled=true]/header:border-white/5 group-data-[scrolled=true]/header:bg-ink-950/85 group-data-[scrolled=true]/header:backdrop-blur-xl"
      />
      <div className="wrap flex h-full items-center gap-6">
        <Link href="/" className="shrink-0 rounded-sm" aria-label="AFTERLIGHT home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="relative rounded-full px-3.5 py-2 text-sm font-semibold text-bone-200 transition-colors hover:text-bone-50 aria-[current=page]:text-bone-50 aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3.5 aria-[current=page]:after:-bottom-0.5 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-ember-400"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            aria-current={isActive(pathname, "/search") ? "page" : undefined}
            className="grid h-11 w-11 place-items-center rounded-full text-bone-200 transition-colors hover:bg-white/10 hover:text-bone-50 aria-[current=page]:text-ember-300"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-bone-200 transition-colors hover:bg-white/10 hover:text-bone-50 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="fixed-lock fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 overflow-y-auto bg-ink-950/97 backdrop-blur-xl lg:hidden"
      >
        <nav aria-label="Mobile" className="wrap py-6">
          <ul className="flex flex-col gap-1">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className="display block rounded-card px-3 py-3 text-4xl text-bone-200 transition-colors hover:bg-white/5 hover:text-bone-50 aria-[current=page]:text-ember-400"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="display block rounded-card px-3 py-3 text-4xl text-bone-200 transition-colors hover:bg-white/5 hover:text-bone-50"
              >
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

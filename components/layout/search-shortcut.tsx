"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SEARCH_INPUT_ID, requestSearchFocus } from "@/lib/search-focus";

/** Global "/" shortcut: focuses site search (navigating to /search first). Ignored while typing in a field. */
export function SearchShortcut() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      if (pathname === "/search") document.getElementById(SEARCH_INPUT_ID)?.focus();
      else {
        requestSearchFocus();
        router.push("/search");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pathname, router]);
  return null;
}

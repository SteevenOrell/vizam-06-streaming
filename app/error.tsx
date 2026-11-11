"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Only the digest is logged; no stack or message is shown to visitors.
    console.error("AFTERLIGHT page error", error.digest ?? "");
  }, [error]);

  return (
    <div className="wrap grid min-h-[60vh] place-content-center py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display mt-3 text-5xl text-bone-50 sm:text-7xl">Signal lost</h1>
      <p className="mx-auto mt-4 max-w-md text-bone-200">This page could not load. Try again, or head back home.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </div>
    </div>
  );
}

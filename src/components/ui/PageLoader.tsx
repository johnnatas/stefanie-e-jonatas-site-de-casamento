"use client";

import { useEffect, useState } from "react";
import { Monogram } from "@/components/ui/Monogram";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/shared/utils/cn";

/**
 * Full-screen splash shown while the page's assets (scripts, fonts, images)
 * are still loading, hidden once the browser's `load` event fires — not on
 * React hydration alone, since that can complete before images/fonts finish.
 */
export function PageLoader() {
  const [loaded, setLoaded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    function handleLoad() {
      setLoaded(true);
    }

    // `readyState` is checked fresh here (not just once, before this effect
    // ever ran) because the browser's `load` event can fire in the gap
    // between the initial render and this effect committing — if it does,
    // a listener added only for *future* `load` events would wait forever
    // (the infinite-loader bug). `readyState` itself, unlike the one-shot
    // event, stays "complete" once true, so checking it here is race-free.
    if (document.readyState === "complete") {
      const timeoutId = setTimeout(handleLoad, 0);
      return () => clearTimeout(timeoutId);
    }

    window.addEventListener("load", handleLoad);
    return () => window.removeEventListener("load", handleLoad);
  }, []);

  return (
    <div
      aria-hidden={loaded}
      data-testid="page-loader"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-paper transition-opacity duration-500",
        loaded ? "pointer-events-none opacity-0" : "opacity-100"
      )}
    >
      <Monogram className={cn("h-20 w-auto", !prefersReducedMotion && "animate-page-loader-pulse")} />
    </div>
  );
}

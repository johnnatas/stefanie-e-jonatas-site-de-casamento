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
  const [loaded, setLoaded] = useState(() => typeof document !== "undefined" && document.readyState === "complete");
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (loaded) return;

    function handleLoad() {
      setLoaded(true);
    }

    window.addEventListener("load", handleLoad);
    return () => window.removeEventListener("load", handleLoad);
  }, [loaded]);

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

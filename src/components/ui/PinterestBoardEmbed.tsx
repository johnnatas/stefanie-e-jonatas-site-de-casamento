"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    PinUtils?: { build: (el?: HTMLElement) => void };
  }
}

interface PinterestBoardEmbedProps {
  boardUrl: string;
  label?: string | null;
}

const DEFAULT_LABEL = "Ver inspirações no Pinterest";
const MAX_BUILD_ATTEMPTS = 20;
const BUILD_RETRY_MS = 250;
// How long to wait, after `window.PinUtils` is first ever observed to exist,
// before we call build() ourselves — gives Pinterest's own one-time,
// first-load auto-scan a chance to embed the current anchor without our
// call racing it (which throws inside pinit.js's internals, harmlessly, but
// noisily). Only matters for the very first board on the page; every
// mount after that already knows the auto-scan is long done and calls
// build() immediately.
const AUTO_SCAN_GRACE_MS = 1600;
// Minimum gap enforced between any two `PinUtils.build()` calls anywhere on
// the page — when Ela and Ele boards mount at the same time, calling
// build() for both within the same tick can throw inside pinit.js's
// internals (it appears to share state across calls), even though neither
// call is racing the first-load auto-scan.
const BUILD_QUEUE_GAP_MS = 120;

let pinUtilsFirstSeenAt: number | null = null;
let buildQueue: Promise<void> = Promise.resolve();

/** Test-only: resets module-level state between tests. */
export function __resetPinterestAutoScanStateForTests() {
  pinUtilsFirstSeenAt = null;
  buildQueue = Promise.resolve();
}

function queueBuild(build: (el?: HTMLElement) => void, el?: HTMLElement) {
  buildQueue = buildQueue.then(
    () =>
      new Promise<void>((resolve) => {
        build(el);
        setTimeout(resolve, BUILD_QUEUE_GAP_MS);
      })
  );
}

/**
 * Pinterest's pinit.js widget only scans the DOM for `data-pin-do` anchors
 * once, when the script itself first loads — it does not notice anchors
 * added later by client-side navigation (e.g. switching themes and back),
 * which is why the embed loaded inconsistently before. Explicitly calling
 * `window.PinUtils.build()` re-triggers that scan, scoped to this
 * component's own container.
 */
export function PinterestBoardEmbed({ boardUrl, label }: PinterestBoardEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function isEmbedded() {
      return Boolean(containerRef.current?.querySelector("iframe"));
    }

    function tryBuild() {
      if (isEmbedded()) return;

      const pinUtils = typeof window !== "undefined" ? window.PinUtils : undefined;
      if (pinUtils?.build) {
        if (pinUtilsFirstSeenAt === null) pinUtilsFirstSeenAt = Date.now();
        const withinFirstLoadGrace = Date.now() - pinUtilsFirstSeenAt < AUTO_SCAN_GRACE_MS;
        if (!withinFirstLoadGrace) {
          queueBuild(pinUtils.build, containerRef.current ?? undefined);
        }
      }

      attempts += 1;
      if (attempts < MAX_BUILD_ATTEMPTS && !isEmbedded()) {
        timeoutId = setTimeout(tryBuild, BUILD_RETRY_MS);
      }
    }

    timeoutId = setTimeout(tryBuild, BUILD_RETRY_MS);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [boardUrl]);

  return (
    <div ref={containerRef}>
      <a
        data-pin-do="embedBoard"
        data-pin-board-width="900"
        data-pin-scale-height="240"
        data-pin-scale-width="80"
        href={boardUrl}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 font-sans text-sm text-forest transition-colors hover:border-moss hover:text-moss"
      >
        {label || DEFAULT_LABEL}
      </a>
      <Script async defer src="https://assets.pinterest.com/js/pinit.js" strategy="lazyOnload" />
    </div>
  );
}

"use client";

import { useId } from "react";

interface TornPaperDividerProps {
  fill?: string;
  className?: string;
}

const TORN_EDGE_PATH =
  "M0 40 C 40 10, 80 70, 120 35 S 200 5, 240 45 S 320 75, 360 30 S 440 0, 480 40 " +
  "S 560 80, 600 35 S 680 5, 720 42 S 800 78, 840 33 S 920 3, 960 44 " +
  "S 1040 76, 1080 32 S 1160 4, 1200 42 S 1280 74, 1320 34 S 1400 6, 1440 40 " +
  "V120 H0 Z";

/**
 * Full-width irregular "torn paper" edge, used to close a dark photo
 * section into the lighter section below it (see references/images/
 * efeito-papel-rasgado.png — not in the repo, local design reference).
 */
export function TornPaperDivider({ fill = "var(--color-paper)", className }: TornPaperDividerProps) {
  const filterId = useId();

  return (
    <svg
      aria-hidden="true"
      data-testid="torn-paper-divider"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className={className}
    >
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
      </filter>
      <path d={TORN_EDGE_PATH} fill={fill} filter={`url(#${filterId})`} />
    </svg>
  );
}

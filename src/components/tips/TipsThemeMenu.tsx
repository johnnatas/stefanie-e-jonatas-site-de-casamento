"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";

export type TipsTheme = "cerimonia" | "vestimenta" | "hospedagem";

const THEMES: { theme: TipsTheme; label: string }[] = [
  { theme: "cerimonia", label: "a cerimônia" },
  { theme: "vestimenta", label: "código de vestimenta" },
  { theme: "hospedagem", label: "hospedagem" },
];

const DESKTOP_BREAKPOINT_PX = 1024; // Tailwind's `lg`

interface FixedMenuStyle {
  left: number;
  width: number;
  top: number;
  height: number;
}

/**
 * True `position: fixed` on desktop (glued to the viewport while scrolling,
 * per the user's explicit request — not `position: sticky`), vertically
 * centered in the viewport, but capped so it never overlaps the Footer:
 * once the page has scrolled far enough that centering would push the menu
 * past the bottom of its content shell (`[data-tips-shell]`, which ends
 * right before the Footer), `top` is recomputed each scroll tick to track
 * that shell's bottom edge instead, so the menu "runs out" of room exactly
 * at the shell's end rather than floating over the Footer.
 */
export function TipsThemeMenu({ active }: { active: TipsTheme }) {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [fixedStyle, setFixedStyle] = useState<FixedMenuStyle | null>(null);

  useEffect(() => {
    function update() {
      const placeholder = placeholderRef.current;
      const nav = navRef.current;
      if (!placeholder || !nav) return;

      if (window.innerWidth < DESKTOP_BREAKPOINT_PX) {
        setFixedStyle(null);
        return;
      }

      const shell = placeholder.closest("[data-tips-shell]");
      if (!shell) return;

      const placeholderRect = placeholder.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const navHeight = nav.offsetHeight;
      const shellAbsoluteBottom = shellRect.bottom + window.scrollY;
      const trackingTop = shellAbsoluteBottom - navHeight - window.scrollY;
      const centeredTop = (window.innerHeight - navHeight) / 2;

      setFixedStyle({
        left: placeholderRect.left,
        width: placeholderRect.width,
        top: Math.min(centeredTop, trackingTop),
        height: navHeight,
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={placeholderRef} style={fixedStyle ? { height: fixedStyle.height } : undefined}>
      <nav
        ref={navRef}
        style={
          fixedStyle
            ? { position: "fixed", left: fixedStyle.left, width: fixedStyle.width, top: fixedStyle.top }
            : undefined
        }
        className="flex flex-col items-center gap-5 lg:items-start"
      >
        {THEMES.map(({ theme, label }) => {
          const isActive = theme === active;
          return (
            <Link
              key={theme}
              href={`/dicas-e-instrucoes?tema=${theme}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                isActive
                  ? "font-script text-xl italic text-moss"
                  : "font-sans text-sm uppercase tracking-widest text-forest/70 transition-colors hover:text-moss"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

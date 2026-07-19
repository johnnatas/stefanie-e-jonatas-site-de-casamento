"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/shared/navigation";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Monogram } from "@/components/ui/Monogram";
import { cn } from "@/shared/utils/cn";

const TRANSPARENT_SCROLL_THRESHOLD_PX = 80;

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isTransparent = isHome && !isScrolled;

  useLayoutEffect(() => {
    if (!isHome) return;

    function handleScroll() {
      setIsScrolled(window.scrollY > TRANSPARENT_SCROLL_THRESHOLD_PX);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex h-[72px] items-center transition-colors",
        isTransparent ? "bg-transparent text-paper" : "border-b border-line bg-[#ffffff] text-forest"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Início" className="text-current">
          <Monogram light={isTransparent} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition-colors",
                  isActive
                    ? "font-script text-lg italic text-moss"
                    : "font-serif uppercase tracking-[0.2em] text-current/80 hover:text-moss"
                )}
              >
                {isActive ? item.label.toLowerCase() : item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menu"
          className="flex flex-col gap-1.5 md:hidden"
        >
          <span className="block h-px w-6 bg-current" />
          <span className="block h-px w-6 bg-current" />
          <span className="block h-px w-4 bg-current" />
        </button>
      </div>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
}

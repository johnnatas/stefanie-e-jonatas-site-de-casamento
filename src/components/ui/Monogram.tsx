import { cn } from "@/shared/utils/cn";

interface MonogramProps {
  className?: string;
}

/**
 * Oval-outline monogram mark with the couple's initials in script,
 * replacing the old loose "S & J" wordmark in Header/MobileMenu/Footer.
 */
export function Monogram({ className }: MonogramProps) {
  return (
    <span
      className={cn("relative inline-flex h-10 w-8 items-center justify-center text-current", className)}
    >
      <svg viewBox="0 0 64 88" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <ellipse cx="32" cy="44" rx="26" ry="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="relative font-script text-lg leading-none">S&amp;J</span>
    </span>
  );
}

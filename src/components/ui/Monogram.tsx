import { cn } from "@/shared/utils/cn";

interface MonogramProps {
  className?: string;
}

/**
 * The couple's official logo mark, used in Header/MobileMenu/Footer.
 * Source: references/images/logo-stefanie-jonatas.png (local design
 * reference, not in the repo — shipped copy lives at
 * public/images/logo.png).
 */
export function Monogram({ className }: MonogramProps) {
  return (
    <img
      src="/images/logo.png"
      alt="Stéfanie & Jonatas"
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}

import { cn } from "@/shared/utils/cn";

interface MonogramProps {
  className?: string;
  light?: boolean;
  srcDark?: string | null;
  srcLight?: string | null;
}

/**
 * The couple's official logo mark, used in Header/MobileMenu/Footer.
 * Source: references/images/logo-stefanie-jonatas.png (local design
 * reference, not in the repo — shipped copy lives at
 * public/images/logo.png). `light` swaps to the light-colored variant
 * (references/images/logo-stefanie-jonatas-300x600_claro.png, shipped at
 * public/images/logo-light.png) for use over dark backgrounds, e.g. the
 * Header's transparent state over the hero photo. `srcDark`/`srcLight`
 * let callers override either variant with an admin-uploaded logo
 * (src/app/admin/(protected)/conteudo/identidade-visual); omitting them
 * (or passing null) keeps the static file as-is.
 */
export function Monogram({ className, light, srcDark, srcLight }: MonogramProps) {
  const fallback = light ? "/images/logo-light.png" : "/images/logo.png";
  const override = light ? srcLight : srcDark;

  return (
    <img
      src={override ?? fallback}
      alt="Stéfanie & Jonatas"
      className={cn("h-10 w-auto object-contain transition-[height] duration-300", className)}
    />
  );
}

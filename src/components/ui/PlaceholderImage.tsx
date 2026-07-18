import { cn } from "@/shared/utils/cn";

interface PlaceholderImageProps {
  label: string;
  className?: string;
}

/**
 * Stand-in for a real couple photo. The reference site's photos are the
 * original couple's copyrighted content, so every image slot here is a
 * placeholder until Stéfanie & Jonatas provide their own photos.
 */
export function PlaceholderImage({ label, className }: PlaceholderImageProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-gold/25 via-paper-soft to-charcoal/15",
        className
      )}
    >
      <span className="px-4 text-center font-serif text-sm italic text-ink-soft">{label}</span>
    </div>
  );
}

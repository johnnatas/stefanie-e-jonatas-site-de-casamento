import { cn } from "@/shared/utils/cn";

interface TornPaperDividerProps {
  className?: string;
}

/**
 * Full-width torn paper edge, used to close a dark photo section into the
 * lighter section below it. Uses the reference site's own torn-paper
 * texture (public/images/torn-paper.png, sourced from
 * references/images/papel-rasgado.png — local design reference, not in
 * the repo) instead of a generated shape.
 */
export function TornPaperDivider({ className }: TornPaperDividerProps) {
  return (
    <div aria-hidden="true" data-testid="torn-paper-divider" className={cn("relative overflow-hidden", className)}>
      <img
        src="/images/torn-paper.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    </div>
  );
}

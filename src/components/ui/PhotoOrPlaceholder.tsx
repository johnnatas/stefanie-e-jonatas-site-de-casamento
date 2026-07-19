import { cn } from "@/shared/utils/cn";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

interface PhotoOrPlaceholderProps {
  src: string | null;
  label: string;
  className?: string;
}

export function PhotoOrPlaceholder({ src, label, className }: PhotoOrPlaceholderProps) {
  if (src) {
    return <img src={src} alt="" className={cn("object-cover", className)} />;
  }

  return <PlaceholderImage label={label} className={className} />;
}

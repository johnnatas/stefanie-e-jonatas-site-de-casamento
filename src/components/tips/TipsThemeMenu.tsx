import Link from "next/link";
import { cn } from "@/shared/utils/cn";

export type TipsTheme = "cerimonia" | "vestimenta" | "hospedagem";

const THEMES: { theme: TipsTheme; label: string }[] = [
  { theme: "cerimonia", label: "a cerimônia" },
  { theme: "vestimenta", label: "código de vestimenta" },
  { theme: "hospedagem", label: "hospedagem" },
];

export function TipsThemeMenu({ active }: { active: TipsTheme }) {
  return (
    <nav className="flex flex-col items-center gap-5 lg:sticky lg:top-32 lg:items-start lg:self-start">
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
  );
}

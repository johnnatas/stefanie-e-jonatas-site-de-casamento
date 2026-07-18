import Link from "next/link";
import { NAV_ITEMS } from "@/shared/navigation";
import { Monogram } from "@/components/ui/Monogram";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 text-center">
        <Monogram className="h-12 w-10" />

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-serif text-xs uppercase tracking-[0.2em] text-ink-soft hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="font-sans text-xs text-ink-soft">
          Feito com carinho para celebrar o nosso grande dia.
        </p>
      </div>
    </footer>
  );
}

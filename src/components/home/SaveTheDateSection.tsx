import { Monogram } from "@/components/ui/Monogram";
import { PillButton } from "@/components/ui/PillButton";
import { PolaroidGallery } from "@/components/ui/PolaroidGallery";
import type { HomeGalleryContent } from "@/application/content/schemas";

const HEADING_LINES = [
  { text: "Save", color: "var(--color-forest)", opacity: 1 },
  { text: "the", color: "var(--color-forest)", opacity: 0.7 },
  { text: "date!", color: "var(--color-moss)", opacity: 1 },
];

interface SaveTheDateSectionProps {
  gallery: HomeGalleryContent;
}

export function SaveTheDateSection({ gallery }: SaveTheDateSectionProps) {
  return (
    <section className="bg-mist px-6 py-32">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 md:flex-row md:items-center md:gap-24">
        <div className="flex flex-col items-center gap-8 text-center md:items-start md:text-left">
          <h2 className="flex flex-col items-center gap-1 md:items-start">
            {HEADING_LINES.map((line) => (
              <span
                key={line.text}
                className="font-serif text-6xl uppercase leading-none sm:text-7xl"
                style={{ color: line.color, opacity: line.opacity }}
              >
                {line.text}
              </span>
            ))}
          </h2>

          <div className="flex items-center gap-4">
            <Monogram className="h-12 w-auto" />
            <PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>
          </div>
        </div>

        <div className="flex-1">
          <PolaroidGallery items={gallery.items} />
        </div>
      </div>
    </section>
  );
}

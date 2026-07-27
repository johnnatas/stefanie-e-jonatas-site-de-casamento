import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import type { TipsCerimoniaContent } from "@/application/content/schemas";

export function CeremonyTheme({ content }: { content: TipsCerimoniaContent }) {
  const infoLines = [
    content.eventDateLabel,
    content.eventTimeLabel,
    content.eventVenueLabel,
    content.eventAddress,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-64 w-full max-w-xl overflow-hidden rounded-lg border border-line">
        <PhotoOrPlaceholder
          src={content.photo}
          label="Local da cerimônia"
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <h1 className="mt-10 text-center font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>

      {infoLines.length > 0 && (
        <>
          <div className="mt-6 h-px w-16 bg-line" />
          <div className="mt-6 flex flex-col items-center gap-1 text-center font-sans text-sm uppercase tracking-widest text-forest">
            {infoLines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </>
      )}

      {content.routes.length > 0 && (
        <div className="mt-14 flex w-full max-w-2xl flex-col gap-12">
          {content.routes.map((route, index) => (
            <div key={index}>
              <h2 className="font-serif text-2xl text-forest">{route.originLabel}</h2>
              <div className="mt-3 font-sans text-sm leading-relaxed text-forest/80">
                {renderMarkdown(route.instructions)}
              </div>
              {route.mapUrl && (
                <a
                  href={route.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block font-sans text-sm text-moss hover:text-forest"
                >
                  Ver rota no mapa →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function CeremonyPage() {
  const content = await getSiteContentOrDefault("tips-cerimonia");
  const hasEventDetails = content.eventDateLabel || content.eventTimeLabel || content.eventAddress;

  return (
    <div>
      <SplitPanel
        eyebrow={content.eyebrow ?? undefined}
        title={content.title}
        tone="dark"
        image={
          <PhotoOrPlaceholder
            src={content.photo}
            label="Local da cerimônia"
            className="absolute inset-0 h-full w-full"
          />
        }
      >
        {renderMarkdown(content.body)}
      </SplitPanel>

      {hasEventDetails && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <dl className="flex flex-col gap-4 border-y border-line py-8 font-sans text-sm text-forest sm:flex-row sm:justify-between sm:gap-8">
            {content.eventDateLabel && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-forest/60">Data</dt>
                <dd className="mt-1 font-serif text-lg">{content.eventDateLabel}</dd>
              </div>
            )}
            {content.eventTimeLabel && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-forest/60">Horário</dt>
                <dd className="mt-1 font-serif text-lg">{content.eventTimeLabel}</dd>
              </div>
            )}
            {content.eventAddress && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-forest/60">Endereço</dt>
                <dd className="mt-1 font-serif text-lg">{content.eventAddress}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {content.routes.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-20">
          <h2 className="font-serif text-2xl text-forest">Como chegar</h2>
          <div className="mt-6 flex flex-col gap-10">
            {content.routes.map((route, index) => (
              <div key={index}>
                <h3 className="font-serif text-lg text-forest">{route.originLabel}</h3>
                <div className="mt-2 font-sans text-sm leading-relaxed text-forest/80">
                  {renderMarkdown(route.instructions)}
                </div>
                {route.mapUrl && (
                  <a
                    href={route.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-sans text-sm text-moss hover:text-forest"
                  >
                    Ver rota no mapa →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function LodgingPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <div>
      <SplitPanel
        eyebrow={content.eyebrow ?? undefined}
        title={content.title}
        tone="dark"
        image={
          <PhotoOrPlaceholder src={content.photo} label="Hospedagem" className="absolute inset-0 h-full w-full" />
        }
      >
        {renderMarkdown(content.body)}
      </SplitPanel>

      <div className="mx-auto max-w-3xl px-6 py-16">
        {content.distances.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl text-forest">Distâncias</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.distances.map((distance, index) => (
                <li key={index} className="flex justify-between border-b border-line py-2">
                  <span>{distance.label}</span>
                  <span className="text-forest/60">{distance.km}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {content.hotels.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl text-forest">Hotéis e pousadas</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.hotels.map((hotel, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2"
                >
                  {hotel.url ? (
                    <a href={hotel.url} target="_blank" rel="noreferrer" className="text-moss hover:text-forest">
                      {hotel.name}
                    </a>
                  ) : (
                    <span>{hotel.name}</span>
                  )}
                  {hotel.distanceLabel && <span className="text-forest/60">{hotel.distanceLabel}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {content.airports.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-2xl text-forest">Aeroportos</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.airports.map((airport, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2"
                >
                  <span>{airport.name}</span>
                  <span className="text-forest/60">
                    {[airport.distanceLabel, airport.driveTimeLabel].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="mt-12 font-sans text-xs font-semibold text-forest/60">{content.disclaimer}</p>
      </div>
    </div>
  );
}

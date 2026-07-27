import { GoogleMapEmbed } from "@/components/ui/GoogleMapEmbed";
import type { TipsHospedagemContent } from "@/application/content/schemas";

export function LodgingTheme({ content }: { content: TipsHospedagemContent }) {
  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:gap-12">
      {content.mapAddress && (
        <div className="lg:order-1">
          <GoogleMapEmbed address={content.mapAddress} />
        </div>
      )}

      <div className="lg:order-2">
        <h1 className="font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>

        {content.distances.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-forest">Distâncias</h2>
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
          <section className="mt-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-forest">Hotéis</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.hotels.map((hotel, index) => (
                <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2">
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

        <p className="mt-8 font-sans text-xs font-semibold text-forest/60">{content.disclaimer}</p>

        {content.airports.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide text-forest">Aeroportos</h2>
            <ol className="mt-4 flex flex-col gap-2 font-sans text-sm text-forest/80">
              {content.airports.map((airport, index) => (
                <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2">
                  <span>{airport.name}</span>
                  <span className="text-forest/60">
                    {[airport.distanceLabel, airport.driveTimeLabel].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

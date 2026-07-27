interface GoogleMapEmbedProps {
  address: string;
}

/**
 * Interactive Google Maps embed driven by a plain address string — uses the
 * keyless `output=embed` endpoint (no billing/API key). No box-shadow per the
 * project's flat design rule; edge defined with a border.
 */
export function GoogleMapEmbed({ address }: GoogleMapEmbedProps) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=12&output=embed`;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line">
      <iframe
        title={`Mapa: ${address}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

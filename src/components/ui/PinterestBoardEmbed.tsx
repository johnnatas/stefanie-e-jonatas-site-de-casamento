import Script from "next/script";

interface PinterestBoardEmbedProps {
  boardUrl: string;
  label?: string | null;
}

const DEFAULT_LABEL = "Ver inspirações no Pinterest";

/**
 * Pinterest's pinit.js widget replaces this anchor with the real board embed
 * once it loads (can take a few seconds) — style the anchor as a proper CTA
 * rather than a bare URL, since that's what's visible until the swap happens
 * (or if the widget script never loads, e.g. blocked by an ad blocker).
 */
export function PinterestBoardEmbed({ boardUrl, label }: PinterestBoardEmbedProps) {
  return (
    <div>
      <a
        data-pin-do="embedBoard"
        data-pin-board-width="900"
        data-pin-scale-height="240"
        data-pin-scale-width="80"
        href={boardUrl}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 font-sans text-sm text-forest transition-colors hover:border-moss hover:text-moss"
      >
        {label || DEFAULT_LABEL}
      </a>
      <Script async defer src="https://assets.pinterest.com/js/pinit.js" strategy="lazyOnload" />
    </div>
  );
}

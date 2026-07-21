import Script from "next/script";

interface PinterestBoardEmbedProps {
  boardUrl: string;
}

export function PinterestBoardEmbed({ boardUrl }: PinterestBoardEmbedProps) {
  return (
    <div>
      <a
        data-pin-do="embedBoard"
        data-pin-board-width="900"
        data-pin-scale-height="240"
        data-pin-scale-width="80"
        href={boardUrl}
      >
        {boardUrl}
      </a>
      <Script async defer src="https://assets.pinterest.com/js/pinit.js" strategy="lazyOnload" />
    </div>
  );
}

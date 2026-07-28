import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { DressCodeInspiration } from "@/components/tips/DressCodeInspiration";
import { fetchPinterestBoardPins } from "@/infrastructure/pinterest/fetchPinterestBoardPins";
import type { TipsTrajeContent } from "@/application/content/schemas";

export async function DressCodeTheme({ content }: { content: TipsTrajeContent }) {
  const [himPins, herPins] = await Promise.all([
    content.pinterestHimUrl ? fetchPinterestBoardPins(content.pinterestHimUrl) : Promise.resolve([]),
    content.pinterestHerUrl ? fetchPinterestBoardPins(content.pinterestHerUrl) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>
      <h2 className="mt-8 text-center font-serif text-4xl uppercase tracking-wide text-forest sm:text-5xl">
        {content.dressCodeName}
      </h2>
      <div className="mt-6 max-w-xl text-center font-sans text-sm leading-relaxed text-forest/80">
        {renderMarkdown(content.body)}
      </div>
      <div className="mt-12 w-full max-w-5xl">
        <DressCodeInspiration himPins={himPins} herPins={herPins} />
      </div>
    </div>
  );
}

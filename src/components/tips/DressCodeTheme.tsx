import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { DressCodeInspiration } from "@/components/tips/DressCodeInspiration";
import type { TipsTrajeContent } from "@/application/content/schemas";

export function DressCodeTheme({ content }: { content: TipsTrajeContent }) {
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-center font-script text-4xl italic text-forest sm:text-5xl">{content.title}</h1>
      <h2 className="mt-8 text-center font-serif text-4xl uppercase tracking-wide text-forest sm:text-5xl">
        {content.dressCodeName}
      </h2>
      <div className="mt-6 max-w-xl text-center font-sans text-sm leading-relaxed text-forest/80">
        {renderMarkdown(content.body)}
      </div>
      <div className="mt-12 w-full max-w-4xl">
        <DressCodeInspiration him={content.pinterestHimUrl} her={content.pinterestHerUrl} />
      </div>
    </div>
  );
}

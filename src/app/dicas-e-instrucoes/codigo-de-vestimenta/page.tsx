import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { PinterestBoardEmbed } from "@/components/ui/PinterestBoardEmbed";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function DressCodePage() {
  const content = await getSiteContentOrDefault("tips-traje");
  const hasGenderSections = content.forHim || content.forHer;

  return (
    <div>
      <SplitPanel
        eyebrow={content.eyebrow ?? undefined}
        title={content.title}
        tone="light"
        imageSide="left"
        image={
          <PhotoOrPlaceholder
            src={content.photo}
            label="Inspiração de traje"
            className="absolute inset-0 h-full w-full"
          />
        }
      >
        {renderMarkdown(content.body)}
      </SplitPanel>

      {hasGenderSections && (
        <section className="mx-auto grid max-w-3xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2">
          {content.forHim && (
            <div>
              <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-moss">Ele</h2>
              <div className="mt-3 font-sans text-sm leading-relaxed text-forest/80">
                {renderMarkdown(content.forHim)}
              </div>
            </div>
          )}
          {content.forHer && (
            <div>
              <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-moss">Ela</h2>
              <div className="mt-3 font-sans text-sm leading-relaxed text-forest/80">
                {renderMarkdown(content.forHer)}
              </div>
            </div>
          )}
        </section>
      )}

      {content.pinterestBoardUrl && (
        <section className="mx-auto max-w-3xl px-6 pb-20">
          <h2 className="font-serif text-2xl text-forest">Inspirações</h2>
          <div className="mt-6">
            <PinterestBoardEmbed boardUrl={content.pinterestBoardUrl} />
          </div>
        </section>
      )}
    </div>
  );
}

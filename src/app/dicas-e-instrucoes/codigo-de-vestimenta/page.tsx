import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function DressCodePage() {
  const content = await getSiteContentOrDefault("tips-traje");

  return (
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
  );
}

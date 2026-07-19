import { SplitPanel } from "@/components/ui/SplitPanel";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";
import { getSiteContentOrDefault } from "@/infrastructure/composition";

export default async function LodgingPage() {
  const content = await getSiteContentOrDefault("tips-hospedagem");

  return (
    <SplitPanel
      eyebrow={content.eyebrow ?? undefined}
      title={content.title}
      tone="dark"
      image={<PhotoOrPlaceholder src={content.photo} label="Hospedagem" className="absolute inset-0 h-full w-full" />}
    >
      {renderMarkdown(content.body)}
    </SplitPanel>
  );
}

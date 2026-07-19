import { z } from "zod";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";
import { SITE_CONTENT_SCHEMAS, SiteContentSlug } from "@/application/content/schemas";

export class UpdateSiteContentUseCase {
  constructor(private readonly repository: SiteContentRepository) {}

  async execute<Slug extends SiteContentSlug>(
    slug: Slug,
    content: z.input<(typeof SITE_CONTENT_SCHEMAS)[Slug]>
  ): Promise<void> {
    const schema = SITE_CONTENT_SCHEMAS[slug];
    const parsed = schema.parse(content);
    await this.repository.upsert(slug, parsed as Record<string, unknown>);
  }
}

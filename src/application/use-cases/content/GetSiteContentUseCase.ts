import { z } from "zod";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";
import { SITE_CONTENT_SCHEMAS, SiteContentSlug } from "@/application/content/schemas";

export class GetSiteContentUseCase {
  constructor(private readonly repository: SiteContentRepository) {}

  async execute<Slug extends SiteContentSlug>(
    slug: Slug
  ): Promise<z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>> {
    const section = await this.repository.findBySlug(slug);
    const schema = SITE_CONTENT_SCHEMAS[slug];
    return schema.parse(section?.content ?? {}) as z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>;
  }
}

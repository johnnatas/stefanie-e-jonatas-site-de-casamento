import { SiteContentSection } from "@/domain/entities/SiteContentSection";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";

export class InMemorySiteContentRepository implements SiteContentRepository {
  private sections = new Map<string, SiteContentSection>();

  async findBySlug(slug: string): Promise<SiteContentSection | null> {
    return this.sections.get(slug) ?? null;
  }

  async upsert(slug: string, content: Record<string, unknown>): Promise<SiteContentSection> {
    const section = SiteContentSection.create({ slug, content, updatedAt: new Date() });
    this.sections.set(slug, section);
    return section;
  }
}

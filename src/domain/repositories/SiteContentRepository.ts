import { SiteContentSection } from "@/domain/entities/SiteContentSection";

export interface SiteContentRepository {
  findBySlug(slug: string): Promise<SiteContentSection | null>;
  upsert(slug: string, content: Record<string, unknown>): Promise<SiteContentSection>;
}

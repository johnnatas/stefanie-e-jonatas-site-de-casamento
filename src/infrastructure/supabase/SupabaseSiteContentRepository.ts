import { SupabaseClient } from "@supabase/supabase-js";
import { SiteContentSection } from "@/domain/entities/SiteContentSection";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";

interface SiteContentRow {
  slug: string;
  content: Record<string, unknown>;
  updated_at: string;
}

function toEntity(row: SiteContentRow): SiteContentSection {
  return SiteContentSection.create({
    slug: row.slug,
    content: row.content,
    updatedAt: new Date(row.updated_at),
  });
}

export class SupabaseSiteContentRepository implements SiteContentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findBySlug(slug: string): Promise<SiteContentSection | null> {
    const { data, error } = await this.client.from("site_content").select().eq("slug", slug).maybeSingle();

    if (error) {
      throw new Error(`Failed to find site content "${slug}": ${error.message}`);
    }

    return data ? toEntity(data as SiteContentRow) : null;
  }

  async upsert(slug: string, content: Record<string, unknown>): Promise<SiteContentSection> {
    const { data, error } = await this.client
      .from("site_content")
      .upsert({ slug, content }, { onConflict: "slug" })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save site content "${slug}": ${error.message}`);
    }

    return toEntity(data as SiteContentRow);
  }
}

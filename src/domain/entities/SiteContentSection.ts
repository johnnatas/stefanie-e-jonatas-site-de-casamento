import { InvalidSiteContentError } from "@/domain/errors/DomainError";

export interface SiteContentSectionProps {
  slug: string;
  content: Record<string, unknown>;
  updatedAt?: Date;
}

export class SiteContentSection {
  readonly slug: string;
  readonly content: Record<string, unknown>;
  readonly updatedAt: Date;

  private constructor(props: SiteContentSectionProps) {
    this.slug = props.slug;
    this.content = props.content;
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static create(props: SiteContentSectionProps): SiteContentSection {
    if (!props.slug || props.slug.trim().length === 0) {
      throw new InvalidSiteContentError("Site content slug is required.");
    }

    return new SiteContentSection(props);
  }
}

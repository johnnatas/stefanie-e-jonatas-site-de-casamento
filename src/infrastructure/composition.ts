import { getSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRoleClient";
import { SupabaseGuestRepository } from "@/infrastructure/supabase/SupabaseGuestRepository";
import { SupabaseGiftRepository } from "@/infrastructure/supabase/SupabaseGiftRepository";
import { SupabaseGiftContributionRepository } from "@/infrastructure/supabase/SupabaseGiftContributionRepository";
import { SupabaseSiteContentRepository } from "@/infrastructure/supabase/SupabaseSiteContentRepository";
import { GetSiteContentUseCase } from "@/application/use-cases/content/GetSiteContentUseCase";
import { UpdateSiteContentUseCase } from "@/application/use-cases/content/UpdateSiteContentUseCase";
import { isBackendConfigured } from "@/infrastructure/config/env";
import { SITE_CONTENT_SCHEMAS, SiteContentSlug } from "@/application/content/schemas";
import { z } from "zod";
import { MercadoPagoGateway } from "@/infrastructure/payments/MercadoPagoGateway";
import { ConfirmRsvpUseCase } from "@/application/use-cases/rsvp/ConfirmRsvpUseCase";
import { ListGiftsUseCase } from "@/application/use-cases/gifts/ListGiftsUseCase";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { ListGuestsUseCase } from "@/application/use-cases/admin/ListGuestsUseCase";
import { SearchGuestsUseCase } from "@/application/use-cases/rsvp/SearchGuestsUseCase";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { UpdateGuestUseCase } from "@/application/use-cases/admin/UpdateGuestUseCase";
import { DeleteGuestUseCase } from "@/application/use-cases/admin/DeleteGuestUseCase";
import { DeleteGiftUseCase } from "@/application/use-cases/admin/DeleteGiftUseCase";
import { GetDashboardSummaryUseCase } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";

export { uploadSiteContentPhoto, InvalidPhotoUploadError } from "@/infrastructure/supabase/uploadSiteContentPhoto";
export { resolvePhotoField } from "@/infrastructure/supabase/resolvePhotoField";

/**
 * Composition root: wires domain/application use-cases to their Supabase and
 * Mercado Pago implementations. Only import this from Server Actions, Route
 * Handlers or Server Components — never from client components.
 */
function repositories() {
  const client = getSupabaseServiceRoleClient();
  return {
    guestRepository: new SupabaseGuestRepository(client),
    giftRepository: new SupabaseGiftRepository(client),
    giftContributionRepository: new SupabaseGiftContributionRepository(client),
    siteContentRepository: new SupabaseSiteContentRepository(client),
    paymentGateway: new MercadoPagoGateway(),
  };
}

export function createConfirmRsvpUseCase(): ConfirmRsvpUseCase {
  return new ConfirmRsvpUseCase(repositories().guestRepository);
}

export function createListGiftsUseCase(): ListGiftsUseCase {
  return new ListGiftsUseCase(repositories().giftRepository);
}

export function createGiftContributionUseCase(): CreateGiftContributionUseCase {
  const { giftRepository, giftContributionRepository, paymentGateway } = repositories();
  return new CreateGiftContributionUseCase(giftRepository, giftContributionRepository, paymentGateway);
}

export function createConfirmGiftPaymentUseCase(): ConfirmGiftPaymentUseCase {
  const { giftRepository, giftContributionRepository, paymentGateway } = repositories();
  return new ConfirmGiftPaymentUseCase(giftRepository, giftContributionRepository, paymentGateway);
}

export function createListGuestsUseCase(): ListGuestsUseCase {
  return new ListGuestsUseCase(repositories().guestRepository);
}

export function createGetDashboardSummaryUseCase(): GetDashboardSummaryUseCase {
  const { guestRepository, giftRepository, giftContributionRepository } = repositories();
  return new GetDashboardSummaryUseCase(guestRepository, giftRepository, giftContributionRepository);
}

export function createUpsertGiftUseCase(): UpsertGiftUseCase {
  return new UpsertGiftUseCase(repositories().giftRepository);
}

export function createSearchGuestsUseCase(): SearchGuestsUseCase {
  return new SearchGuestsUseCase(repositories().guestRepository);
}

export function createCreateGuestUseCase(): CreateGuestUseCase {
  return new CreateGuestUseCase(repositories().guestRepository);
}

export function createUpdateGuestUseCase(): UpdateGuestUseCase {
  return new UpdateGuestUseCase(repositories().guestRepository);
}

export function createDeleteGuestUseCase(): DeleteGuestUseCase {
  return new DeleteGuestUseCase(repositories().guestRepository);
}

export function createDeleteGiftUseCase(): DeleteGiftUseCase {
  return new DeleteGiftUseCase(repositories().giftRepository);
}

export function createGetSiteContentUseCase(): GetSiteContentUseCase {
  return new GetSiteContentUseCase(repositories().siteContentRepository);
}

export function createUpdateSiteContentUseCase(): UpdateSiteContentUseCase {
  return new UpdateSiteContentUseCase(repositories().siteContentRepository);
}

/**
 * Fetches content for a slug, falling back to the slug's schema defaults
 * when Supabase isn't configured or the fetch fails — public pages must
 * never break because content hasn't been saved yet.
 */
export async function getSiteContentOrDefault<Slug extends SiteContentSlug>(
  slug: Slug
): Promise<z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>> {
  const schema = SITE_CONTENT_SCHEMAS[slug];

  if (!isBackendConfigured()) {
    return schema.parse({}) as z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>;
  }

  try {
    return await createGetSiteContentUseCase().execute(slug);
  } catch {
    return schema.parse({}) as z.output<(typeof SITE_CONTENT_SCHEMAS)[Slug]>;
  }
}

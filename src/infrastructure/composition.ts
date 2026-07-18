import { getSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRoleClient";
import { SupabaseGuestRepository } from "@/infrastructure/supabase/SupabaseGuestRepository";
import { SupabaseGiftRepository } from "@/infrastructure/supabase/SupabaseGiftRepository";
import { SupabaseGiftContributionRepository } from "@/infrastructure/supabase/SupabaseGiftContributionRepository";
import { MercadoPagoGateway } from "@/infrastructure/payments/MercadoPagoGateway";
import { ConfirmRsvpUseCase } from "@/application/use-cases/rsvp/ConfirmRsvpUseCase";
import { ListGiftsUseCase } from "@/application/use-cases/gifts/ListGiftsUseCase";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { ListGuestsUseCase } from "@/application/use-cases/admin/ListGuestsUseCase";
import { GetDashboardSummaryUseCase } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";

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

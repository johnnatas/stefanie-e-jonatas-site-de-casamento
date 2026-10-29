import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { InfinitePayStatusChecker } from "@/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase";

export interface ConfirmInfinitePayRedirectInput {
  giftId: string;
  transactionNsu: string;
  slug: string;
}

/**
 * Infinite Pay only accepts order_nsu + transaction_nsu + slug together on
 * /payment_check, and all three must be the exact values from the checkout
 * redirect — not the ones generated at link creation or received via
 * webhook. This is the only point where we reliably have all three, so it
 * doubles as a second, synchronous confirmation path alongside the webhook.
 */
export class ConfirmInfinitePayRedirectUseCase {
  constructor(
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly infinitePayGateway: InfinitePayStatusChecker,
    private readonly confirmGiftPaymentUseCase: ConfirmGiftPaymentUseCase
  ) {}

  async execute(input: ConfirmInfinitePayRedirectInput): Promise<void> {
    const contribution = await this.giftContributionRepository.findPendingByGiftId(input.giftId);
    if (!contribution || contribution.paymentProvider !== "infinite_pay") {
      return;
    }

    const status = await this.infinitePayGateway.checkPaymentStatus({
      orderNsu: input.giftId,
      transactionNsu: input.transactionNsu,
      slug: input.slug,
    });

    if (!status.paid) {
      return;
    }

    await this.confirmGiftPaymentUseCase.execute({
      payment: {
        paymentReference: input.transactionNsu,
        status: "approved",
        giftId: input.giftId,
        contributionId: contribution.id,
        paidAmount: status.paidAmount,
        invoiceSlug: input.slug,
      },
    });
  }
}

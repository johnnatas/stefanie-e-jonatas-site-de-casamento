import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { GiftContribution } from "@/domain/entities/GiftContribution";

export interface InfinitePayStatusChecker {
  checkPaymentStatus(orderNsu: string): Promise<{ paid: boolean; paidAmount?: number }>;
}

export interface SyncInfinitePayPaymentsResult {
  checked: number;
  updated: number;
  errors: Array<{ contributionId: string; message: string }>;
}

export class SyncInfinitePayPaymentsUseCase {
  constructor(
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly infinitePayGateway: InfinitePayStatusChecker,
    private readonly confirmGiftPaymentUseCase: ConfirmGiftPaymentUseCase
  ) {}

  async execute(): Promise<SyncInfinitePayPaymentsResult> {
    const allContributions = await this.giftContributionRepository.findAll();
    const candidates = allContributions.filter(
      (contribution) =>
        (contribution.status === "pending" || contribution.status === "expired") &&
        contribution.paymentProvider === "infinite_pay"
    );

    const latestByGiftId = new Map<string, GiftContribution>();
    for (const contribution of candidates) {
      const existing = latestByGiftId.get(contribution.giftId);
      if (!existing || contribution.createdAt.getTime() > existing.createdAt.getTime()) {
        latestByGiftId.set(contribution.giftId, contribution);
      }
    }
    const deduped = Array.from(latestByGiftId.values());

    const result: SyncInfinitePayPaymentsResult = { checked: 0, updated: 0, errors: [] };

    for (const contribution of deduped) {
      result.checked += 1;
      try {
        const status = await this.infinitePayGateway.checkPaymentStatus(contribution.giftId);
        if (status.paid) {
          // The Infinite Pay payment_check response doesn't return a
          // transaction_nsu, so we fall back to the existing one (set by a
          // prior webhook attempt) or the gift id — this reference is only
          // used as the contribution's stored payment reference, not to
          // look anything up.
          await this.confirmGiftPaymentUseCase.execute({
            payment: {
              paymentReference: contribution.infinitePayTransactionNsu ?? contribution.giftId,
              status: "approved",
              giftId: contribution.giftId,
              paidAmount: status.paidAmount,
              contributionId: contribution.id,
            },
          });
          result.updated += 1;
        }
      } catch (error) {
        console.error(
          `Failed to sync Infinite Pay payment for contribution ${contribution.id} (gift ${contribution.giftId})`,
          error
        );
        result.errors.push({
          contributionId: contribution.id!,
          message: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    return result;
  }
}

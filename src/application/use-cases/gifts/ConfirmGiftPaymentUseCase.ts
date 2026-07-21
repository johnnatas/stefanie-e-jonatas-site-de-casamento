import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export interface ConfirmGiftPaymentInput {
  paymentId: string;
}

export class ConfirmGiftPaymentUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(input: ConfirmGiftPaymentInput): Promise<GiftContribution | null> {
    const payment = await this.paymentGateway.getPayment(input.paymentId);

    const contribution = await this.giftContributionRepository.findPendingByGiftId(payment.externalReference);
    if (!contribution) {
      return null;
    }

    if (payment.status === "pending") {
      return contribution;
    }

    const gift = await this.giftRepository.findById(contribution.giftId);

    if (payment.status === "approved") {
      const updatedContribution = await this.giftContributionRepository.update(
        contribution.approve(payment.paymentId)
      );
      if (gift) {
        await this.giftRepository.update(gift.markAsPaid());
      }
      return updatedContribution;
    }

    const updatedContribution = await this.giftContributionRepository.update(
      contribution.reject(payment.paymentId)
    );
    if (gift) {
      await this.giftRepository.update(gift.releaseToAvailable());
    }
    return updatedContribution;
  }
}

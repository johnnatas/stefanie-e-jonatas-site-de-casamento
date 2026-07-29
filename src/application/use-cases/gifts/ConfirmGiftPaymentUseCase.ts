import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { paymentThankYouEmail } from "@/infrastructure/email/templates";

export interface ConfirmedPayment {
  paymentReference: string;
  status: "approved" | "rejected";
  giftId: string;
  paidAmount?: number;
}

export interface ConfirmGiftPaymentInput {
  payment: ConfirmedPayment;
}

export class ConfirmGiftPaymentUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(input: ConfirmGiftPaymentInput): Promise<GiftContribution | null> {
    const contribution = await this.giftContributionRepository.findPendingByGiftId(input.payment.giftId);
    if (!contribution) {
      return null;
    }

    if (
      input.payment.status === "approved" &&
      input.payment.paidAmount !== undefined &&
      input.payment.paidAmount !== contribution.amount
    ) {
      console.error(
        `Payment amount mismatch for contribution ${contribution.id}: expected ${contribution.amount}, got ${input.payment.paidAmount}`
      );
      return contribution;
    }

    const gift = await this.giftRepository.findById(contribution.giftId);

    if (input.payment.status === "approved") {
      const updatedContribution = await this.giftContributionRepository.update(
        contribution.approve(input.payment.paymentReference)
      );
      if (gift) {
        await this.giftRepository.update(gift.markAsPaid());
      }
      await this.sendThankYouEmail(updatedContribution, gift?.name ?? "seu presente");
      return updatedContribution;
    }

    const updatedContribution = await this.giftContributionRepository.update(
      contribution.reject(input.payment.paymentReference)
    );
    if (gift) {
      await this.giftRepository.update(gift.releaseToAvailable());
    }
    return updatedContribution;
  }

  private async sendThankYouEmail(contribution: GiftContribution, giftName: string): Promise<void> {
    try {
      const alreadySent = await this.notificationLogRepository.hasBeenSent(
        "payment_thank_you",
        "gift_contribution",
        contribution.id!
      );
      if (alreadySent) {
        return;
      }

      const { subject, html } = paymentThankYouEmail({ guestName: contribution.guestName, giftName });
      await this.emailGateway.sendEmail({ to: contribution.guestEmail, subject, html });
      await this.notificationLogRepository.markSent("payment_thank_you", "gift_contribution", contribution.id!);
    } catch (error) {
      // A failed thank-you email must never roll back a real payment
      // confirmation — log and move on, matching the reservation-email
      // best-effort pattern used elsewhere in this codebase.
      console.error("Failed to send payment thank-you email", error);
    }
  }
}

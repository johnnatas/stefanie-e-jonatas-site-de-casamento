import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { reservationConfirmationEmail } from "@/infrastructure/email/templates";
import { formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";

export interface SendReservationConfirmationInput {
  contributionId: string;
  guestName: string;
  guestEmail: string;
  giftName: string;
  expectedPaymentDate: Date;
  checkoutUrl: string;
}

export class SendReservationConfirmationUseCase {
  constructor(
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(input: SendReservationConfirmationInput): Promise<void> {
    const alreadySent = await this.notificationLogRepository.hasBeenSent(
      "reservation_confirmation",
      "gift_contribution",
      input.contributionId
    );
    if (alreadySent) {
      return;
    }

    const { subject, html } = reservationConfirmationEmail({
      guestName: input.guestName,
      giftName: input.giftName,
      formattedDate: formatBrasiliaDate(input.expectedPaymentDate),
      checkoutUrl: input.checkoutUrl,
    });

    await this.emailGateway.sendEmail({ to: input.guestEmail, subject, html });
    await this.notificationLogRepository.markSent(
      "reservation_confirmation",
      "gift_contribution",
      input.contributionId
    );
  }
}

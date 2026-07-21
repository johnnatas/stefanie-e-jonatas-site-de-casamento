import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationKind, NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { daysBetweenBrasiliaDates, formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";
import { reservationReminderEmail } from "@/infrastructure/email/templates";

const REMINDER_THRESHOLDS: Record<number, NotificationKind> = {
  10: "reservation_reminder_t10",
  7: "reservation_reminder_t7",
  3: "reservation_reminder_t3",
  1: "reservation_reminder_t1",
  0: "reservation_reminder_t0",
};

export class SendReservationRemindersUseCase {
  constructor(
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly giftRepository: GiftRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(today: Date = new Date()): Promise<number> {
    const contributions = await this.giftContributionRepository.findAll();
    const pendingWithDate = contributions.filter(
      (contribution) => contribution.status === "pending" && contribution.expectedPaymentDate !== null
    );

    let sentCount = 0;

    for (const contribution of pendingWithDate) {
      const daysUntil = daysBetweenBrasiliaDates(today, contribution.expectedPaymentDate!);
      const kind = REMINDER_THRESHOLDS[daysUntil];
      if (!kind) {
        continue;
      }

      const alreadySent = await this.notificationLogRepository.hasBeenSent(
        kind,
        "gift_contribution",
        contribution.id!
      );
      if (alreadySent) {
        continue;
      }

      const gift = await this.giftRepository.findById(contribution.giftId);
      if (!gift || !gift.mercadoPagoCheckoutUrl) {
        continue;
      }

      const { subject, html } = reservationReminderEmail({
        guestName: contribution.guestName,
        giftName: gift.name,
        formattedDate: formatBrasiliaDate(contribution.expectedPaymentDate!),
        checkoutUrl: gift.mercadoPagoCheckoutUrl,
      });

      await this.emailGateway.sendEmail({ to: contribution.guestEmail, subject, html });
      await this.notificationLogRepository.markSent(kind, "gift_contribution", contribution.id!);
      sentCount++;
    }

    return sentCount;
  }
}

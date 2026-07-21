import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationKind, NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { daysBetweenBrasiliaDates, formatBrasiliaDate } from "@/shared/utils/brasiliaCalendarDays";
import { giftSuggestionEmail } from "@/infrastructure/email/templates";

const SUGGESTION_THRESHOLDS: Record<number, NotificationKind> = {
  90: "gift_suggestion_t90",
  60: "gift_suggestion_t60",
  30: "gift_suggestion_t30",
  15: "gift_suggestion_t15",
  3: "gift_suggestion_t3",
};

export class SendGiftSuggestionRemindersUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(weddingDate: Date, giftsUrl: string, today: Date = new Date()): Promise<number> {
    const daysUntilWedding = daysBetweenBrasiliaDates(today, weddingDate);
    const kind = SUGGESTION_THRESHOLDS[daysUntilWedding];
    if (!kind) {
      return 0;
    }

    const [guests, contributions] = await Promise.all([
      this.guestRepository.findAll(),
      this.giftContributionRepository.findAll(),
    ]);

    const emailsWithActiveContribution = new Set(
      contributions
        .filter((contribution) => contribution.status === "pending" || contribution.status === "approved")
        .map((contribution) => contribution.guestEmail)
    );

    const confirmedGuestsWithoutGift = guests.filter(
      (guest) =>
        guest.attendanceStatus === "confirmed" && guest.email && !emailsWithActiveContribution.has(guest.email)
    );

    let sentCount = 0;

    for (const guest of confirmedGuestsWithoutGift) {
      const alreadySent = await this.notificationLogRepository.hasBeenSent(kind, "guest", guest.id!);
      if (alreadySent) {
        continue;
      }

      const { subject, html } = giftSuggestionEmail({
        guestName: guest.fullName,
        daysUntilWedding,
        formattedWeddingDate: formatBrasiliaDate(weddingDate),
        giftsUrl,
      });

      await this.emailGateway.sendEmail({ to: guest.email!, subject, html });
      await this.notificationLogRepository.markSent(kind, "guest", guest.id!);
      sentCount++;
    }

    return sentCount;
  }
}

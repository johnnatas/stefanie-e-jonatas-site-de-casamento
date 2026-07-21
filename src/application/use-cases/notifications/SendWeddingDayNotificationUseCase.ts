import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { daysBetweenBrasiliaDates } from "@/shared/utils/brasiliaCalendarDays";
import { weddingDayEmail } from "@/infrastructure/email/templates";

export class SendWeddingDayNotificationUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(weddingDate: Date, today: Date = new Date()): Promise<number> {
    if (daysBetweenBrasiliaDates(today, weddingDate) !== 0) {
      return 0;
    }

    const guests = await this.guestRepository.findAll();
    const confirmedGuestsWithEmail = guests.filter(
      (guest) => guest.attendanceStatus === "confirmed" && guest.email
    );

    let sentCount = 0;

    for (const guest of confirmedGuestsWithEmail) {
      const alreadySent = await this.notificationLogRepository.hasBeenSent("wedding_day", "guest", guest.id!);
      if (alreadySent) {
        continue;
      }

      const { subject, html } = weddingDayEmail({ guestName: guest.fullName });

      await this.emailGateway.sendEmail({ to: guest.email!, subject, html });
      await this.notificationLogRepository.markSent("wedding_day", "guest", guest.id!);
      sentCount++;
    }

    return sentCount;
  }
}

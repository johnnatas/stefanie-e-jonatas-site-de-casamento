import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { NotificationLogRepository } from "@/domain/repositories/NotificationLogRepository";
import { rsvpConfirmationEmail } from "@/infrastructure/email/templates";

export interface SendRsvpConfirmationInput {
  guestId: string;
  guestName: string;
  guestEmail: string;
  companionGuestIds: string[];
  message?: string;
}

export class SendRsvpConfirmationUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly emailGateway: EmailGateway,
    private readonly notificationLogRepository: NotificationLogRepository
  ) {}

  async execute(input: SendRsvpConfirmationInput): Promise<void> {
    const alreadySent = await this.notificationLogRepository.hasBeenSent(
      "rsvp_confirmation",
      "guest",
      input.guestId
    );
    if (alreadySent) {
      return;
    }

    const companionNames: string[] = [];
    for (const companionId of input.companionGuestIds) {
      const companion = await this.guestRepository.findById(companionId);
      if (companion) {
        companionNames.push(companion.nickname ?? companion.fullName);
      }
    }

    const { subject, html } = rsvpConfirmationEmail({
      guestName: input.guestName,
      companionNames,
      message: input.message,
    });

    await this.emailGateway.sendEmail({ to: input.guestEmail, subject, html });
    await this.notificationLogRepository.markSent("rsvp_confirmation", "guest", input.guestId);
  }
}

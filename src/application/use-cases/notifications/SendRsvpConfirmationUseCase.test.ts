import { describe, expect, it } from "vitest";
import { SendRsvpConfirmationUseCase } from "@/application/use-cases/notifications/SendRsvpConfirmationUseCase";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";

describe("SendRsvpConfirmationUseCase", () => {
  it("sends a confirmation email listing companion names and the guest's message", async () => {
    const guestRepository = new InMemoryGuestRepository();
    const companion = await guestRepository.save(
      Guest.create({ fullName: "Bruno Ferreira Costa", companionsCount: 0, attendanceStatus: "confirmed" })
    );
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendRsvpConfirmationUseCase(guestRepository, emailGateway, notificationLogRepository);

    await useCase.execute({
      guestId: "guest-1",
      guestName: "João Pedro Almeida",
      guestEmail: "joao@example.com",
      companionGuestIds: [companion.id!],
      message: "Vai ser lindo!",
    });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("joao@example.com");
    expect(emailGateway.sentEmails[0].html).toContain("Bruno Ferreira Costa");
    expect(emailGateway.sentEmails[0].html).toContain("Vai ser lindo!");
    expect(await notificationLogRepository.hasBeenSent("rsvp_confirmation", "guest", "guest-1")).toBe(true);
  });

  it("does not include a companions line when there are no companions", async () => {
    const guestRepository = new InMemoryGuestRepository();
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendRsvpConfirmationUseCase(guestRepository, emailGateway, notificationLogRepository);

    await useCase.execute({
      guestId: "guest-1",
      guestName: "João Pedro Almeida",
      guestEmail: "joao@example.com",
      companionGuestIds: [],
    });

    expect(emailGateway.sentEmails[0].html).not.toContain("confirmou presença também");
  });

  it("does not send twice for the same guest", async () => {
    const guestRepository = new InMemoryGuestRepository();
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendRsvpConfirmationUseCase(guestRepository, emailGateway, notificationLogRepository);
    const input = {
      guestId: "guest-1",
      guestName: "João Pedro Almeida",
      guestEmail: "joao@example.com",
      companionGuestIds: [],
    };

    await useCase.execute(input);
    await useCase.execute(input);

    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});

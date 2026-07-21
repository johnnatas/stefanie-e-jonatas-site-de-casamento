import { beforeEach, describe, expect, it } from "vitest";
import { SendWeddingDayNotificationUseCase } from "@/application/use-cases/notifications/SendWeddingDayNotificationUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Guest } from "@/domain/entities/Guest";

describe("SendWeddingDayNotificationUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let useCase: SendWeddingDayNotificationUseCase;

  const weddingDate = new Date("2027-06-19T16:00:00-03:00");

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    useCase = new SendWeddingDayNotificationUseCase(guestRepository, emailGateway, notificationLogRepository);
  });

  it("sends the wedding-day email to confirmed guests with an email on the wedding day", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-06-19T08:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, today);

    expect(sentCount).toBe(1);
    expect(emailGateway.sentEmails[0].subject).toBe("Hoje é o grande dia! 💍");
  });

  it("does not send on a day other than the wedding day", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-06-18T08:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, today);

    expect(sentCount).toBe(0);
  });

  it("does not send to a guest who hasn't confirmed attendance", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    );
    const today = new Date("2027-06-19T08:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, today);

    expect(sentCount).toBe(0);
  });

  it("does not send twice on the same day", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-06-19T08:00:00-03:00");

    await useCase.execute(weddingDate, today);
    const secondRunSentCount = await useCase.execute(weddingDate, today);

    expect(secondRunSentCount).toBe(0);
    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});

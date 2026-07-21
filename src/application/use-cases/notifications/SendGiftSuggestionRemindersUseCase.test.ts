import { beforeEach, describe, expect, it } from "vitest";
import { SendGiftSuggestionRemindersUseCase } from "@/application/use-cases/notifications/SendGiftSuggestionRemindersUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Guest } from "@/domain/entities/Guest";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("SendGiftSuggestionRemindersUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let useCase: SendGiftSuggestionRemindersUseCase;

  const weddingDate = new Date("2027-06-19T16:00:00-03:00");
  const giftsUrl = "https://sjcasamento.site/presentes";

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    useCase = new SendGiftSuggestionRemindersUseCase(
      guestRepository,
      contributionRepository,
      emailGateway,
      notificationLogRepository
    );
  });

  it("sends a suggestion to a confirmed guest without a gift 30 days before the wedding", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(1);
    expect(emailGateway.sentEmails[0].to).toBe("bruna@example.com");
  });

  it("does not send when today doesn't match any threshold", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-05-25T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(0);
  });

  it("does not send to a guest who already has an active gift contribution", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Bruna Lima",
        guestEmail: "bruna@example.com",
        amount: 200,
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

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
    const today = new Date("2027-05-20T09:00:00-03:00");

    const sentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(sentCount).toBe(0);
  });

  it("does not send twice for the same threshold", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Bruna Lima",
        email: "bruna@example.com",
        phone: "11999990000",
        companionsCount: 0,
        attendanceStatus: "confirmed",
      })
    );
    const today = new Date("2027-05-20T09:00:00-03:00");

    await useCase.execute(weddingDate, giftsUrl, today);
    const secondRunSentCount = await useCase.execute(weddingDate, giftsUrl, today);

    expect(secondRunSentCount).toBe(0);
    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});

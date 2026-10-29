import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConfirmInfinitePayRedirectUseCase,
} from "@/application/use-cases/gifts/ConfirmInfinitePayRedirectUseCase";
import { InfinitePayStatusChecker } from "@/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

describe("ConfirmInfinitePayRedirectUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let checkPaymentStatus: ReturnType<typeof vi.fn>;
  let useCase: ConfirmInfinitePayRedirectUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    const confirmGiftPaymentUseCase = new ConfirmGiftPaymentUseCase(
      giftRepository,
      contributionRepository,
      new FakeEmailGateway(),
      new InMemoryNotificationLogRepository()
    );
    checkPaymentStatus = vi.fn();
    useCase = new ConfirmInfinitePayRedirectUseCase(
      contributionRepository,
      { checkPaymentStatus } as unknown as InfinitePayStatusChecker,
      confirmGiftPaymentUseCase
    );

    await giftRepository.save(
      Gift.create({ id: "gift-1", name: "Liquidificador", description: "d", imageUrl: null, price: 200, category: "cozinha" })
    );
    await giftRepository.update((await giftRepository.findById("gift-1"))!.reserve(new Date(Date.now() + 60_000)));
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Bruna Lima",
        guestEmail: "bruna@example.com",
        amount: 200,
        paymentProvider: "infinite_pay",
      })
    );
  });

  it("checks status with the exact redirect params and approves when paid", async () => {
    checkPaymentStatus.mockResolvedValue({ paid: true, paidAmount: 200 });

    await useCase.execute({ giftId: "gift-1", transactionNsu: "txn-1", slug: "slug-1" });

    expect(checkPaymentStatus).toHaveBeenCalledWith({
      orderNsu: "gift-1",
      transactionNsu: "txn-1",
      slug: "slug-1",
    });
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("does nothing when Infinite Pay reports the order as not paid", async () => {
    checkPaymentStatus.mockResolvedValue({ paid: false });

    await useCase.execute({ giftId: "gift-1", transactionNsu: "txn-1", slug: "slug-1" });

    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
  });

  it("does nothing when there is no pending Infinite Pay contribution for the gift", async () => {
    await useCase.execute({ giftId: "unknown-gift", transactionNsu: "txn-1", slug: "slug-1" });

    expect(checkPaymentStatus).not.toHaveBeenCalled();
  });
});

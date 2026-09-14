import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SyncInfinitePayPaymentsUseCase,
  InfinitePayStatusChecker,
} from "@/application/use-cases/gifts/SyncInfinitePayPaymentsUseCase";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

describe("SyncInfinitePayPaymentsUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let confirmGiftPaymentUseCase: ConfirmGiftPaymentUseCase;
  let checkPaymentStatus: ReturnType<typeof vi.fn>;
  let useCase: SyncInfinitePayPaymentsUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    confirmGiftPaymentUseCase = new ConfirmGiftPaymentUseCase(
      giftRepository,
      contributionRepository,
      new FakeEmailGateway(),
      new InMemoryNotificationLogRepository()
    );
    checkPaymentStatus = vi.fn();
    useCase = new SyncInfinitePayPaymentsUseCase(
      contributionRepository,
      { checkPaymentStatus } as unknown as InfinitePayStatusChecker,
      confirmGiftPaymentUseCase
    );

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: null,
        price: 450,
        category: "cozinha",
        status: "reserved",
      })
    );
  });

  it("confirms a pending Infinite Pay contribution when the gateway reports it as paid", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "infinite_pay",
      })
    );
    checkPaymentStatus.mockResolvedValue({ paid: true, paidAmount: 450 });

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, updated: 1, errors: [] });
    const updatedGift = await giftRepository.findById("gift-1");
    expect(updatedGift!.status).toBe("paid");
  });

  it("leaves unpaid contributions untouched", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "infinite_pay",
      })
    );
    checkPaymentStatus.mockResolvedValue({ paid: false });

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 1, updated: 0, errors: [] });
  });

  it("skips pending contributions from other payment providers", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "mercado_pago",
      })
    );

    const result = await useCase.execute();

    expect(result).toEqual({ checked: 0, updated: 0, errors: [] });
    expect(checkPaymentStatus).not.toHaveBeenCalled();
  });

  it("records an error for one contribution without stopping the others", async () => {
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Ana Silva",
        guestEmail: "ana@example.com",
        amount: 450,
        status: "pending",
        paymentProvider: "infinite_pay",
      })
    );
    checkPaymentStatus.mockRejectedValue(new Error("boom"));

    const result = await useCase.execute();

    expect(result.checked).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("boom");
  });
});

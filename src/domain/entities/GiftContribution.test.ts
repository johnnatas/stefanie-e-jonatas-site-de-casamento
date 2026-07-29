import { describe, expect, it } from "vitest";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { InvalidContributionDataError } from "@/domain/errors/DomainError";

const validProps = {
  giftId: "gift-1",
  guestName: "João Souza",
  guestEmail: "joao@example.com",
  amount: 150,
};

describe("GiftContribution", () => {
  it("creates a pending contribution by default", () => {
    const contribution = GiftContribution.create(validProps);

    expect(contribution.status).toBe("pending");
  });

  it("rejects a non-positive amount", () => {
    expect(() => GiftContribution.create({ ...validProps, amount: 0 })).toThrow(InvalidContributionDataError);
  });

  it("attaches a Mercado Pago preference id", () => {
    const contribution = GiftContribution.create(validProps).withProviderReference("mercado_pago", "pref-123");

    expect(contribution.mercadoPagoPreferenceId).toBe("pref-123");
  });

  it("approves a contribution with a payment id", () => {
    const contribution = GiftContribution.create(validProps).approve("payment-1");

    expect(contribution.status).toBe("approved");
    expect(contribution.mercadoPagoPaymentId).toBe("payment-1");
  });

  it("rejects a contribution with a payment id", () => {
    const contribution = GiftContribution.create(validProps).reject("payment-1");

    expect(contribution.status).toBe("rejected");
  });

  it("defaults expectedPaymentDate to null", () => {
    const contribution = GiftContribution.create(validProps);

    expect(contribution.expectedPaymentDate).toBeNull();
  });

  it("stores an expected payment date when provided", () => {
    const date = new Date("2027-05-01T23:59:59-03:00");
    const contribution = GiftContribution.create({ ...validProps, expectedPaymentDate: date });

    expect(contribution.expectedPaymentDate).toBe(date);
  });

  it("expires a pending contribution", () => {
    const contribution = GiftContribution.create(validProps).expire();

    expect(contribution.status).toBe("expired");
  });
});

describe("GiftContribution payment provider handling", () => {
  function makeContribution(overrides = {}) {
    return GiftContribution.create({
      giftId: "gift-1",
      guestName: "Ana Souza",
      guestEmail: "ana@example.com",
      amount: 200,
      ...overrides,
    });
  }

  it("defaults to the mercado_pago provider and no phone", () => {
    const contribution = makeContribution();
    expect(contribution.paymentProvider).toBe("mercado_pago");
    expect(contribution.guestPhone).toBeNull();
  });

  it("stores the guest phone when provided", () => {
    const contribution = makeContribution({ guestPhone: "+5511987654321" });
    expect(contribution.guestPhone).toBe("+5511987654321");
  });

  it("withProviderReference writes only the given provider's reference field", () => {
    const withMp = makeContribution().withProviderReference("mercado_pago", "pref-1");
    expect(withMp.paymentProvider).toBe("mercado_pago");
    expect(withMp.mercadoPagoPreferenceId).toBe("pref-1");
    expect(withMp.infinitePayOrderNsu).toBeUndefined();

    const withIp = makeContribution().withProviderReference("infinite_pay", "order-1");
    expect(withIp.paymentProvider).toBe("infinite_pay");
    expect(withIp.infinitePayOrderNsu).toBe("order-1");
    expect(withIp.mercadoPagoPreferenceId).toBeUndefined();
  });

  it("approve writes the payment reference into the field matching the contribution's provider", () => {
    const mpApproved = makeContribution({ paymentProvider: "mercado_pago" }).approve("payment-1");
    expect(mpApproved.status).toBe("approved");
    expect(mpApproved.mercadoPagoPaymentId).toBe("payment-1");
    expect(mpApproved.infinitePayTransactionNsu).toBeUndefined();

    const ipApproved = makeContribution({ paymentProvider: "infinite_pay" }).approve("transaction-1");
    expect(ipApproved.status).toBe("approved");
    expect(ipApproved.infinitePayTransactionNsu).toBe("transaction-1");
    expect(ipApproved.mercadoPagoPaymentId).toBeUndefined();
  });

  it("reject writes the payment reference into the field matching the contribution's provider", () => {
    const ipRejected = makeContribution({ paymentProvider: "infinite_pay" }).reject("transaction-2");
    expect(ipRejected.status).toBe("rejected");
    expect(ipRejected.infinitePayTransactionNsu).toBe("transaction-2");
  });
});

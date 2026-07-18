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
    const contribution = GiftContribution.create(validProps).withPreference("pref-123");

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
});

import { describe, expect, it } from "vitest";
import {
  giftSuggestionEmail,
  paymentThankYouEmail,
  reservationConfirmationEmail,
  reservationReminderEmail,
  weddingDayEmail,
} from "@/infrastructure/email/templates";

describe("email templates", () => {
  it("builds the reservation confirmation email", () => {
    const result = reservationConfirmationEmail({
      guestName: "Carla",
      giftName: "Liquidificador",
      formattedDate: "01/05/2027",
      checkoutUrl: "https://mercadopago.test/checkout",
    });

    expect(result.subject).toBe("Reserva confirmada: Liquidificador 🎁");
    expect(result.html).toContain("Carla");
    expect(result.html).toContain("Liquidificador");
    expect(result.html).toContain("01/05/2027");
    expect(result.html).toContain("https://mercadopago.test/checkout");
  });

  it("builds the reservation reminder email", () => {
    const result = reservationReminderEmail({
      guestName: "Carla",
      giftName: "Liquidificador",
      formattedDate: "01/05/2027",
      checkoutUrl: "https://mercadopago.test/checkout",
    });

    expect(result.subject).toBe("Lembrete: sua reserva de Liquidificador");
    expect(result.html).toContain("01/05/2027");
    expect(result.html).toContain("https://mercadopago.test/checkout");
  });

  it("builds the gift suggestion email", () => {
    const result = giftSuggestionEmail({
      guestName: "Carla",
      daysUntilWedding: 30,
      formattedWeddingDate: "19/06/2027",
      giftsUrl: "https://sjcasamento.site/presentes",
    });

    expect(result.subject).toBe("Faltam 30 dias para o nosso casamento!");
    expect(result.html).toContain("19/06/2027");
    expect(result.html).toContain("https://sjcasamento.site/presentes");
  });

  it("builds the wedding day email", () => {
    const result = weddingDayEmail({ guestName: "Carla" });

    expect(result.subject).toBe("Hoje é o grande dia! 💍");
    expect(result.html).toContain("Carla");
  });

  it("builds the payment thank-you email", () => {
    const result = paymentThankYouEmail({ guestName: "Carla", giftName: "Liquidificador" });

    expect(result.subject).toBe("Muito obrigado pelo carinho! 💛");
    expect(result.html).toContain("Carla");
    expect(result.html).toContain("Liquidificador");
  });
});

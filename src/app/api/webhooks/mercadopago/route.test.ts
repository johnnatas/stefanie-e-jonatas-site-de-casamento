import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue(null);
const getPaymentMock = vi.fn();

vi.mock("@/infrastructure/composition", () => ({
  createConfirmGiftPaymentUseCase: () => ({ execute: executeMock }),
  createMercadoPagoGateway: () => ({ getPayment: getPaymentMock }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/mercadopago", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/mercadopago", () => {
  it("ignores notifications that are not payment type", async () => {
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");
    const response = await POST(makeRequest({ type: "merchant_order", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(getPaymentMock).not.toHaveBeenCalled();
  });

  it("does not confirm the payment when it is still pending", async () => {
    getPaymentMock.mockResolvedValueOnce({ paymentId: "1", status: "pending", externalReference: "gift-1" });
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");

    const response = await POST(makeRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("confirms an approved payment", async () => {
    getPaymentMock.mockResolvedValueOnce({ paymentId: "1", status: "approved", externalReference: "gift-1" });
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");

    const response = await POST(makeRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith({
      payment: { paymentReference: "1", status: "approved", giftId: "gift-1" },
    });
  });

  it("returns 500 when confirmation throws, so Mercado Pago retries", async () => {
    getPaymentMock.mockRejectedValueOnce(new Error("Mercado Pago indisponível"));
    const { POST } = await import("@/app/api/webhooks/mercadopago/route");

    const response = await POST(makeRequest({ type: "payment", data: { id: "1" } }));

    expect(response.status).toBe(500);
  });
});

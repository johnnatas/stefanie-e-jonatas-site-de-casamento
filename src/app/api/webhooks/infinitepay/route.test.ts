import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue(null);

vi.mock("@/infrastructure/composition", () => ({
  createConfirmGiftPaymentUseCase: () => ({ execute: executeMock }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/infinitepay", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/infinitepay", () => {
  it("returns 400 for a malformed body", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/infinitepay", { method: "POST", body: "not json" })
    );

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(makeRequest({ order_nsu: "gift-1" }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("converts paid_amount from cents and confirms the payment", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith({
      payment: { paymentReference: "txn-1", status: "approved", giftId: "gift-1", paidAmount: 200 },
    });
  });

  it("returns 500 when confirmation throws", async () => {
    executeMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(500);
  });
});

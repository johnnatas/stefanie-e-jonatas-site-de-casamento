import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const executeMock = vi.fn().mockResolvedValue(null);
const recordMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/infrastructure/composition", () => ({
  createConfirmGiftPaymentUseCase: () => ({ execute: executeMock }),
  createInfinitePayWebhookLogRepository: () => ({ record: recordMock }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/webhooks/infinitepay", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/infinitepay", () => {
  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockResolvedValue(null);
    recordMock.mockReset();
    recordMock.mockResolvedValue(undefined);
  });

  it("returns 400 for a malformed body", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/infinitepay", { method: "POST", body: "not json" })
    );

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(makeRequest({ order_nsu: "gift-1" }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("logs a record with processed: false and a descriptive error when required fields are missing", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    await POST(makeRequest({ order_nsu: "gift-1" }));

    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        processed: false,
        errorMessage: expect.stringContaining("Missing required fields"),
        rawPayload: { order_nsu: "gift-1" },
      })
    );
  });

  it("converts paid_amount from cents and confirms the payment", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith({
      payment: {
        paymentReference: "txn-1",
        status: "approved",
        giftId: "gift-1",
        paidAmount: 200,
        invoiceSlug: undefined,
      },
    });
  });

  it("passes invoice_slug through to ConfirmGiftPaymentUseCase.execute as invoiceSlug", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    await POST(
      makeRequest({
        order_nsu: "gift-1",
        transaction_nsu: "txn-1",
        paid_amount: 20000,
        invoice_slug: "slug-abc",
      })
    );

    expect(executeMock).toHaveBeenCalledWith({
      payment: {
        paymentReference: "txn-1",
        status: "approved",
        giftId: "gift-1",
        paidAmount: 200,
        invoiceSlug: "slug-abc",
      },
    });
  });

  it("results in exactly one record() call with processed: true and the raw payload on success", async () => {
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const payload = { order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000, invoice_slug: "slug-abc" };
    await POST(makeRequest(payload));

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        processed: true,
        rawPayload: payload,
      })
    );
    expect(recordMock.mock.calls[0][0].errorMessage).toBeUndefined();
  });

  it("returns 500 when confirmation throws and logs the error message", async () => {
    executeMock.mockRejectedValueOnce(new Error("db down"));
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(500);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        processed: false,
        errorMessage: "db down",
      })
    );
  });

  it("still returns 200 when record() rejects on the success path, without affecting the response", async () => {
    recordMock.mockRejectedValueOnce(new Error("log insert failed"));
    const { POST } = await import("@/app/api/webhooks/infinitepay/route");
    const response = await POST(
      makeRequest({ order_nsu: "gift-1", transaction_nsu: "txn-1", paid_amount: 20000 })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledTimes(1);
  });
});

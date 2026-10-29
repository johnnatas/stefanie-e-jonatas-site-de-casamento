import { describe, expect, it, vi, beforeEach } from "vitest";

const executeMock = vi.fn();

vi.mock("@/infrastructure/composition", () => ({
  createConfirmGiftPaymentUseCase: () => ({ execute: executeMock }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { reconcileGiftContributionPaymentAction } from "./reconcileGiftContributionPaymentAction";

function formDataOf(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("reconcileGiftContributionPaymentAction", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("requires a transaction NSU", async () => {
    const result = await reconcileGiftContributionPaymentAction(
      { status: "idle" },
      formDataOf({ contributionId: "c1", giftId: "g1", transactionNsu: "" })
    );

    expect(result.status).toBe("error");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("approves the contribution by id using the provided NSU as the payment reference", async () => {
    executeMock.mockResolvedValue({ status: "approved" });

    const result = await reconcileGiftContributionPaymentAction(
      { status: "idle" },
      formDataOf({ contributionId: "c1", giftId: "g1", transactionNsu: "nsu-123" })
    );

    expect(executeMock).toHaveBeenCalledWith({
      payment: { paymentReference: "nsu-123", status: "approved", giftId: "g1", contributionId: "c1" },
    });
    expect(result.status).toBe("success");
  });

  it("reports an error when the contribution could not be approved", async () => {
    executeMock.mockResolvedValue(null);

    const result = await reconcileGiftContributionPaymentAction(
      { status: "idle" },
      formDataOf({ contributionId: "c1", giftId: "g1", transactionNsu: "nsu-123" })
    );

    expect(result.status).toBe("error");
  });
});

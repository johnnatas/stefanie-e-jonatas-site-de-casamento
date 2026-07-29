import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfinitePayGateway } from "@/infrastructure/payments/InfinitePayGateway";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";

describe("InfinitePayGateway", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  async function makeRepository(handle: string | null) {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    if (handle) {
      await repository.updateInfinitePayHandle(handle);
    }
    return repository;
  }

  it("throws when no handle is configured", async () => {
    const repository = await makeRepository(null);
    const gateway = new InfinitePayGateway(repository);

    await expect(
      gateway.createPreference({ title: "Jogo de panelas", amount: 200, externalReference: "gift-1" })
    ).rejects.toThrow("Infinite Pay não está configurado");
  });

  it("creates a preference by posting to the Infinite Pay checkout API", async () => {
    const repository = await makeRepository("meu_handle");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.infinitepay.com.br/abc" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new InfinitePayGateway(repository);
    const result = await gateway.createPreference({
      title: "Jogo de panelas",
      amount: 199.9,
      externalReference: "gift-1",
      payerName: "Ana Souza",
      payerEmail: "ana@example.com",
      payerPhone: "+5511987654321",
    });

    expect(result).toEqual({ preferenceId: "gift-1", checkoutUrl: "https://checkout.infinitepay.com.br/abc" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.checkout.infinitepay.io/links",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.handle).toBe("meu_handle");
    expect(body.order_nsu).toBe("gift-1");
    expect(body.webhook_url).toBe("https://example.test/api/webhooks/infinitepay");
    expect(body.items).toEqual([{ quantity: 1, price: 19990, description: "Jogo de panelas" }]);
    expect(body.customer).toEqual({
      name: "Ana Souza",
      email: "ana@example.com",
      phone_number: "+5511987654321",
    });
  });

  it("throws when the API responds with a non-2xx status", async () => {
    const repository = await makeRepository("meu_handle");
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 }) as unknown as typeof fetch;
    const gateway = new InfinitePayGateway(repository);

    await expect(
      gateway.createPreference({ title: "Jogo de panelas", amount: 200, externalReference: "gift-1" })
    ).rejects.toThrow("422");
  });

  it("throws when the response has no url", async () => {
    const repository = await makeRepository("meu_handle");
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }) as unknown as typeof fetch;
    const gateway = new InfinitePayGateway(repository);

    await expect(
      gateway.createPreference({ title: "Jogo de panelas", amount: 200, externalReference: "gift-1" })
    ).rejects.toThrow("não retornou uma URL");
  });
});

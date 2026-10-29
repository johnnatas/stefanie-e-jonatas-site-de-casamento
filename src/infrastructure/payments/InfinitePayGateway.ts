import { CreatePreferenceInput, CreatePreferenceOutput, PaymentGateway } from "@/application/ports/PaymentGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { getEnv } from "@/infrastructure/config/env";

interface InfinitePayLinkResponse {
  url?: string;
}

interface InfinitePayPaymentCheckResponse {
  success?: boolean;
  paid?: boolean;
  paid_amount?: number;
}

export interface PaymentCheckResult {
  paid: boolean;
  paidAmount?: number;
}

export interface PaymentCheckInput {
  orderNsu: string;
  transactionNsu?: string;
  slug?: string;
}

export class InfinitePayGateway implements PaymentGateway {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.infinitePayHandle) {
      throw new Error("Infinite Pay não está configurado. Configure o handle em Integrações.");
    }

    const siteUrl = getEnv().NEXT_PUBLIC_SITE_URL;

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: this.headers(settings.infinitePayApiKey),
      body: JSON.stringify({
        handle: settings.infinitePayHandle,
        order_nsu: input.externalReference,
        redirect_url: `${siteUrl}/presentes?status=sucesso`,
        // The documented {url, events} object form caused Infinite Pay to
        // stop honoring order_nsu in a live test (2026-10-29): the webhook
        // came back with a random order_nsu instead of the one we sent.
        // webhook_url is the exact format every historically-successful
        // payment confirmation used, so stick with it until Infinite Pay
        // support clarifies the regression.
        webhook_url: `${siteUrl}/api/webhooks/infinitepay`,
        items: [{ quantity: 1, price: Math.round(input.amount * 100), description: input.title }],
        customer: input.payerEmail
          ? { name: input.payerName, email: input.payerEmail, phone_number: input.payerPhone }
          : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Pay retornou ${response.status} ao criar o link de pagamento.`);
    }

    const result = (await response.json()) as InfinitePayLinkResponse;
    if (!result.url) {
      throw new Error("Infinite Pay não retornou uma URL de checkout.");
    }

    return { preferenceId: input.externalReference, checkoutUrl: result.url };
  }

  async checkPaymentStatus(input: PaymentCheckInput): Promise<PaymentCheckResult> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.infinitePayHandle) {
      throw new Error("Infinite Pay não está configurado. Configure o handle em Integrações.");
    }
    if (!settings.infinitePayApiKey) {
      throw new Error("Infinite Pay API Key não está configurada. Configure-a em Integrações.");
    }

    const response = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: this.headers(settings.infinitePayApiKey),
      body: JSON.stringify({
        handle: settings.infinitePayHandle,
        order_nsu: input.orderNsu,
        transaction_nsu: input.transactionNsu,
        slug: input.slug,
      }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Pay retornou ${response.status} ao consultar o status do pagamento.`);
    }

    const result = (await response.json()) as InfinitePayPaymentCheckResponse;
    return {
      paid: result.success === true && result.paid === true,
      paidAmount: typeof result.paid_amount === "number" ? result.paid_amount / 100 : undefined,
    };
  }

  private headers(apiKey: string | null): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["X-Api-Key"] = apiKey;
    }
    return headers;
  }
}

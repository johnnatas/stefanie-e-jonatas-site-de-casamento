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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: settings.infinitePayHandle,
        order_nsu: input.externalReference,
        redirect_url: `${siteUrl}/presentes?status=sucesso`,
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

  async checkPaymentStatus(orderNsu: string): Promise<PaymentCheckResult> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.infinitePayHandle) {
      throw new Error("Infinite Pay não está configurado. Configure o handle em Integrações.");
    }

    const response = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: settings.infinitePayHandle, order_nsu: orderNsu }),
    });

    if (!response.ok) {
      throw new Error(`Infinite Pay retornou ${response.status} ao consultar o status do pagamento.`);
    }

    const result = (await response.json()) as InfinitePayPaymentCheckResponse;
    return {
      paid: result.paid === true,
      paidAmount: typeof result.paid_amount === "number" ? result.paid_amount / 100 : undefined,
    };
  }
}

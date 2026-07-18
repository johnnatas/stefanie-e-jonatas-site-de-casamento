import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import {
  CreatePreferenceInput,
  CreatePreferenceOutput,
  PaymentDetails,
  PaymentGateway,
  PaymentStatus,
} from "@/application/ports/PaymentGateway";
import { getEnv } from "@/infrastructure/config/env";

function mapStatus(mercadoPagoStatus: string | undefined): PaymentStatus {
  if (mercadoPagoStatus === "approved") return "approved";
  if (mercadoPagoStatus === "rejected" || mercadoPagoStatus === "cancelled") return "rejected";
  return "pending";
}

export class MercadoPagoGateway implements PaymentGateway {
  private getClient(): MercadoPagoConfig {
    return new MercadoPagoConfig({ accessToken: getEnv().MERCADOPAGO_ACCESS_TOKEN });
  }

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
    const siteUrl = getEnv().NEXT_PUBLIC_SITE_URL;
    const preference = new Preference(this.getClient());

    const result = await preference.create({
      body: {
        items: [
          {
            id: input.externalReference,
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
            currency_id: "BRL",
          },
        ],
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
        external_reference: input.externalReference,
        back_urls: {
          success: `${siteUrl}/presentes?status=sucesso`,
          pending: `${siteUrl}/presentes?status=pendente`,
          failure: `${siteUrl}/presentes?status=falha`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      },
    });

    if (!result.id || !result.init_point) {
      throw new Error("Mercado Pago did not return a preference id or checkout url.");
    }

    return { preferenceId: result.id, checkoutUrl: result.init_point };
  }

  async getPayment(paymentId: string): Promise<PaymentDetails> {
    const payment = new Payment(this.getClient());
    const result = await payment.get({ id: paymentId });

    if (!result.id || !result.external_reference) {
      throw new Error(`Mercado Pago payment ${paymentId} is missing required fields.`);
    }

    return {
      paymentId: String(result.id),
      status: mapStatus(result.status),
      externalReference: result.external_reference,
    };
  }
}

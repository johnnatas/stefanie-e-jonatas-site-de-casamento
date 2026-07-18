import {
  CreatePreferenceInput,
  CreatePreferenceOutput,
  PaymentDetails,
  PaymentGateway,
  PaymentStatus,
} from "@/application/ports/PaymentGateway";

export class FakePaymentGateway implements PaymentGateway {
  private nextPreferenceId = 1;
  private payments = new Map<string, PaymentDetails>();

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
    const preferenceId = `preference-${this.nextPreferenceId++}`;
    return {
      preferenceId,
      checkoutUrl: `https://mercadopago.test/checkout/${preferenceId}?ref=${input.externalReference}`,
    };
  }

  async getPayment(paymentId: string): Promise<PaymentDetails> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found.`);
    }
    return payment;
  }

  simulatePayment(paymentId: string, status: PaymentStatus, externalReference: string): void {
    this.payments.set(paymentId, { paymentId, status, externalReference });
  }
}

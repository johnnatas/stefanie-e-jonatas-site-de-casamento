export interface CreatePreferenceInput {
  title: string;
  amount: number;
  externalReference: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
}

export interface CreatePreferenceOutput {
  preferenceId: string;
  checkoutUrl: string;
}

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentDetails {
  paymentId: string;
  status: PaymentStatus;
  externalReference: string;
}

export interface PaymentGateway {
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput>;
}

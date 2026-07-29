import { InvalidContributionDataError } from "@/domain/errors/DomainError";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export type ContributionStatus = "pending" | "approved" | "rejected" | "expired";

export interface GiftContributionProps {
  id?: string;
  giftId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  amount: number;
  status?: ContributionStatus;
  paymentProvider?: PaymentProvider;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  infinitePayOrderNsu?: string;
  infinitePayTransactionNsu?: string;
  expectedPaymentDate?: Date | null;
  createdAt?: Date;
}

export class GiftContribution {
  readonly id?: string;
  readonly giftId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone: string | null;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly paymentProvider: PaymentProvider;
  readonly mercadoPagoPreferenceId?: string;
  readonly mercadoPagoPaymentId?: string;
  readonly infinitePayOrderNsu?: string;
  readonly infinitePayTransactionNsu?: string;
  readonly expectedPaymentDate: Date | null;
  readonly createdAt: Date;

  private constructor(props: GiftContributionProps) {
    this.id = props.id;
    this.giftId = props.giftId;
    this.guestName = props.guestName.trim();
    this.guestEmail = props.guestEmail.trim().toLowerCase();
    this.guestPhone = props.guestPhone ?? null;
    this.amount = props.amount;
    this.status = props.status ?? "pending";
    this.paymentProvider = props.paymentProvider ?? "mercado_pago";
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoPaymentId = props.mercadoPagoPaymentId;
    this.infinitePayOrderNsu = props.infinitePayOrderNsu;
    this.infinitePayTransactionNsu = props.infinitePayTransactionNsu;
    this.expectedPaymentDate = props.expectedPaymentDate ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GiftContributionProps): GiftContribution {
    if (!props.giftId) {
      throw new InvalidContributionDataError("Gift contribution must reference a gift.");
    }

    if (!props.guestName || props.guestName.trim().length < 3) {
      throw new InvalidContributionDataError("Guest name must have at least 3 characters.");
    }

    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new InvalidContributionDataError("Contribution amount must be a positive number.");
    }

    return new GiftContribution(props);
  }

  withProviderReference(provider: PaymentProvider, referenceId: string): GiftContribution {
    return provider === "mercado_pago"
      ? new GiftContribution({ ...this, paymentProvider: provider, mercadoPagoPreferenceId: referenceId })
      : new GiftContribution({ ...this, paymentProvider: provider, infinitePayOrderNsu: referenceId });
  }

  approve(paymentReference: string): GiftContribution {
    return this.paymentProvider === "infinite_pay"
      ? new GiftContribution({ ...this, status: "approved", infinitePayTransactionNsu: paymentReference })
      : new GiftContribution({ ...this, status: "approved", mercadoPagoPaymentId: paymentReference });
  }

  reject(paymentReference: string): GiftContribution {
    return this.paymentProvider === "infinite_pay"
      ? new GiftContribution({ ...this, status: "rejected", infinitePayTransactionNsu: paymentReference })
      : new GiftContribution({ ...this, status: "rejected", mercadoPagoPaymentId: paymentReference });
  }

  expire(): GiftContribution {
    return new GiftContribution({ ...this, status: "expired" });
  }
}

import { InvalidContributionDataError } from "@/domain/errors/DomainError";

export type ContributionStatus = "pending" | "approved" | "rejected";

export interface GiftContributionProps {
  id?: string;
  giftId: string;
  guestName: string;
  guestEmail: string;
  amount: number;
  status?: ContributionStatus;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  createdAt?: Date;
}

export class GiftContribution {
  readonly id?: string;
  readonly giftId: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly amount: number;
  readonly status: ContributionStatus;
  readonly mercadoPagoPreferenceId?: string;
  readonly mercadoPagoPaymentId?: string;
  readonly createdAt: Date;

  private constructor(props: GiftContributionProps) {
    this.id = props.id;
    this.giftId = props.giftId;
    this.guestName = props.guestName.trim();
    this.guestEmail = props.guestEmail.trim().toLowerCase();
    this.amount = props.amount;
    this.status = props.status ?? "pending";
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoPaymentId = props.mercadoPagoPaymentId;
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

  withPreference(preferenceId: string): GiftContribution {
    return new GiftContribution({ ...this, mercadoPagoPreferenceId: preferenceId });
  }

  approve(paymentId: string): GiftContribution {
    return new GiftContribution({ ...this, status: "approved", mercadoPagoPaymentId: paymentId });
  }

  reject(paymentId: string): GiftContribution {
    return new GiftContribution({ ...this, status: "rejected", mercadoPagoPaymentId: paymentId });
  }
}

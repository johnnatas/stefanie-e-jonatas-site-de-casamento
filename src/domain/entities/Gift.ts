import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export type GiftStatus = "available" | "reserved" | "paid";

export interface GiftProps {
  id?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
  status?: GiftStatus;
  reservedUntil?: Date | null;
  mercadoPagoPreferenceId?: string;
  mercadoPagoCheckoutUrl?: string | null;
  infinitePayOrderNsu?: string;
  infinitePayCheckoutUrl?: string | null;
  createdAt?: Date;
}

export class Gift {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string | null;
  readonly price: number;
  readonly category: string;
  readonly status: GiftStatus;
  readonly reservedUntil: Date | null;
  readonly mercadoPagoPreferenceId?: string;
  readonly mercadoPagoCheckoutUrl: string | null;
  readonly infinitePayOrderNsu?: string;
  readonly infinitePayCheckoutUrl: string | null;
  readonly createdAt: Date;

  private constructor(props: GiftProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.description = props.description.trim();
    this.imageUrl = props.imageUrl;
    this.price = props.price;
    this.category = props.category.trim();
    this.status = props.status ?? "available";
    this.reservedUntil = props.reservedUntil ?? null;
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoCheckoutUrl = props.mercadoPagoCheckoutUrl ?? null;
    this.infinitePayOrderNsu = props.infinitePayOrderNsu;
    this.infinitePayCheckoutUrl = props.infinitePayCheckoutUrl ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GiftProps): Gift {
    if (!props.name || props.name.trim().length < 2) {
      throw new InvalidGiftDataError("Gift name must have at least 2 characters.");
    }

    if (!Number.isFinite(props.price) || props.price <= 0) {
      throw new InvalidGiftDataError("Gift price must be a positive number.");
    }

    if (!props.category || props.category.trim().length === 0) {
      throw new InvalidGiftDataError("Gift category is required.");
    }

    return new Gift(props);
  }

  isAvailable(): boolean {
    return this.status === "available";
  }

  reserve(reservedUntil: Date): Gift {
    if (!this.isAvailable()) {
      throw new GiftNotAvailableError(`Gift "${this.name}" is not available.`);
    }

    return new Gift({ ...this, status: "reserved", reservedUntil });
  }

  markAsPaid(): Gift {
    return new Gift({ ...this, status: "paid", reservedUntil: null });
  }

  releaseToAvailable(): Gift {
    if (this.status === "paid") {
      throw new GiftNotAvailableError(`Gift "${this.name}" is already paid and cannot be released.`);
    }

    return new Gift({ ...this, status: "available", reservedUntil: null });
  }

  checkoutUrlFor(provider: PaymentProvider): string | null {
    return provider === "mercado_pago" ? this.mercadoPagoCheckoutUrl : this.infinitePayCheckoutUrl;
  }

  providerReferenceIdFor(provider: PaymentProvider): string | undefined {
    return provider === "mercado_pago" ? this.mercadoPagoPreferenceId : this.infinitePayOrderNsu;
  }

  hasLinkFor(provider: PaymentProvider): boolean {
    return this.checkoutUrlFor(provider) !== null;
  }

  withProviderLink(provider: PaymentProvider, referenceId: string, checkoutUrl: string): Gift {
    return provider === "mercado_pago"
      ? new Gift({ ...this, mercadoPagoPreferenceId: referenceId, mercadoPagoCheckoutUrl: checkoutUrl })
      : new Gift({ ...this, infinitePayOrderNsu: referenceId, infinitePayCheckoutUrl: checkoutUrl });
  }
}

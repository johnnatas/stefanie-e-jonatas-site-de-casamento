import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

export type GiftStatus = "available" | "reserved" | "paid";

export interface GiftProps {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  category: string;
  status?: GiftStatus;
  createdAt?: Date;
}

export class Gift {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly price: number;
  readonly category: string;
  readonly status: GiftStatus;
  readonly createdAt: Date;

  private constructor(props: GiftProps) {
    this.id = props.id;
    this.name = props.name.trim();
    this.description = props.description.trim();
    this.imageUrl = props.imageUrl;
    this.price = props.price;
    this.category = props.category.trim();
    this.status = props.status ?? "available";
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

  reserve(): Gift {
    if (!this.isAvailable()) {
      throw new GiftNotAvailableError(`Gift "${this.name}" is not available.`);
    }

    return new Gift({ ...this, status: "reserved" });
  }

  markAsPaid(): Gift {
    return new Gift({ ...this, status: "paid" });
  }

  releaseToAvailable(): Gift {
    if (this.status === "paid") {
      throw new GiftNotAvailableError(`Gift "${this.name}" is already paid and cannot be released.`);
    }

    return new Gift({ ...this, status: "available" });
  }
}

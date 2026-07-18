export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class InvalidGuestDataError extends DomainError {}
export class InvalidGiftDataError extends DomainError {}
export class InvalidContributionDataError extends DomainError {}
export class GiftNotAvailableError extends DomainError {}

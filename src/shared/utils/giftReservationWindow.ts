export const RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING = 30;

export function latestReservableDate(weddingDate: Date): Date {
  return new Date(weddingDate.getTime() - RESERVE_LATER_MIN_DAYS_BEFORE_WEDDING * 24 * 60 * 60 * 1000);
}

export function canReserveForLater(weddingDate: Date, now: Date = new Date()): boolean {
  return latestReservableDate(weddingDate).getTime() > now.getTime();
}

export function parseExpectedPaymentDateEndOfDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59-03:00`);
}

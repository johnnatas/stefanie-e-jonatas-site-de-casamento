import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/infrastructure/config/env";
import {
  createSendGiftSuggestionRemindersUseCase,
  createSendReservationRemindersUseCase,
  createSendWeddingDayNotificationUseCase,
  getSiteContentOrDefault,
} from "@/infrastructure/composition";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSiteContentOrDefault("settings");
  const weddingDate = new Date(settings.weddingDateIso);
  const giftsUrl = `${getEnv().NEXT_PUBLIC_SITE_URL}/presentes`;

  const results = { reservationReminders: 0, giftSuggestions: 0, weddingDay: 0 };

  try {
    results.reservationReminders = await createSendReservationRemindersUseCase().execute();
  } catch (error) {
    console.error("Failed to send reservation reminders", error);
  }

  try {
    results.giftSuggestions = await createSendGiftSuggestionRemindersUseCase().execute(weddingDate, giftsUrl);
  } catch (error) {
    console.error("Failed to send gift suggestion reminders", error);
  }

  try {
    results.weddingDay = await createSendWeddingDayNotificationUseCase().execute(weddingDate);
  } catch (error) {
    console.error("Failed to send wedding day notification", error);
  }

  return NextResponse.json({ received: true, ...results });
}

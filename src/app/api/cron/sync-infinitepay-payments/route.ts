import { NextRequest, NextResponse } from "next/server";
import { createSyncInfinitePayPaymentsUseCase } from "@/infrastructure/composition";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await createSyncInfinitePayPaymentsUseCase().execute();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to sync Infinite Pay payments", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

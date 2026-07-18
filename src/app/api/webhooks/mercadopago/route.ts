import { NextRequest, NextResponse } from "next/server";
import { createConfirmGiftPaymentUseCase } from "@/infrastructure/composition";

interface MercadoPagoWebhookBody {
  type?: string;
  data?: { id?: string };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as MercadoPagoWebhookBody | null;

  const type = body?.type ?? request.nextUrl.searchParams.get("type");
  const paymentId = body?.data?.id ?? request.nextUrl.searchParams.get("data.id");

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  try {
    await createConfirmGiftPaymentUseCase().execute({ paymentId: String(paymentId) });
  } catch (error) {
    console.error("Failed to process Mercado Pago webhook notification", error);
  }

  return NextResponse.json({ received: true });
}

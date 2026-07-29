import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createConfirmGiftPaymentUseCase } from "@/infrastructure/composition";

interface InfinitePayWebhookBody {
  order_nsu?: string;
  transaction_nsu?: string;
  paid_amount?: number;
}

export async function POST(request: Request) {
  let body: InfinitePayWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const { order_nsu, transaction_nsu, paid_amount } = body;
  if (!order_nsu || !transaction_nsu || typeof paid_amount !== "number") {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    await createConfirmGiftPaymentUseCase().execute({
      payment: {
        paymentReference: transaction_nsu,
        status: "approved",
        giftId: order_nsu,
        paidAmount: paid_amount / 100,
      },
    });

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process Infinite Pay webhook", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}

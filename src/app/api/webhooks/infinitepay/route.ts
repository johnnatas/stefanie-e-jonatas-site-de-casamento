import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createConfirmGiftPaymentUseCase,
  createInfinitePayWebhookLogRepository,
} from "@/infrastructure/composition";

interface InfinitePayWebhookBody {
  order_nsu?: string;
  transaction_nsu?: string;
  invoice_slug?: string;
  paid_amount?: number;
}

export async function POST(request: Request) {
  let body: InfinitePayWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const { order_nsu, transaction_nsu, invoice_slug, paid_amount } = body;
  const webhookLogRepository = createInfinitePayWebhookLogRepository();

  if (!order_nsu || !transaction_nsu || typeof paid_amount !== "number") {
    await webhookLogRepository.record({
      orderNsu: order_nsu,
      transactionNsu: transaction_nsu,
      invoiceSlug: invoice_slug,
      paidAmount: paid_amount,
      rawPayload: body,
      processed: false,
      errorMessage: "Missing required fields: order_nsu, transaction_nsu, or paid_amount",
    });
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    await createConfirmGiftPaymentUseCase().execute({
      payment: {
        paymentReference: transaction_nsu,
        status: "approved",
        giftId: order_nsu,
        paidAmount: paid_amount / 100,
        invoiceSlug: invoice_slug,
      },
    });

    await webhookLogRepository.record({
      orderNsu: order_nsu,
      transactionNsu: transaction_nsu,
      invoiceSlug: invoice_slug,
      paidAmount: paid_amount,
      rawPayload: body,
      processed: true,
    });

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process Infinite Pay webhook", error);
    await webhookLogRepository.record({
      orderNsu: order_nsu,
      transactionNsu: transaction_nsu,
      invoiceSlug: invoice_slug,
      paidAmount: paid_amount,
      rawPayload: body,
      processed: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error processing Infinite Pay webhook",
    });
    return NextResponse.json({ received: false }, { status: 500 });
  }
}

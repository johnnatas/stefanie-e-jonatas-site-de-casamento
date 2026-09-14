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

async function safeRecord(
  webhookLogRepository: ReturnType<typeof createInfinitePayWebhookLogRepository>,
  event: Parameters<ReturnType<typeof createInfinitePayWebhookLogRepository>["record"]>[0]
): Promise<void> {
  try {
    await webhookLogRepository.record(event);
  } catch (error) {
    // A failure to write the durable log must never change the HTTP
    // response or double-invoke payment processing — log and swallow.
    console.error("Failed to log Infinite Pay webhook event", error);
  }
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
    await safeRecord(webhookLogRepository, {
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

    await safeRecord(webhookLogRepository, {
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
    await safeRecord(webhookLogRepository, {
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

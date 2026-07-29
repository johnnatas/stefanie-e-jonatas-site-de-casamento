"use server";

import { revalidatePath } from "next/cache";
import {
  createListGiftsUseCase,
  createUpsertGiftUseCase,
  createRefreshGiftPaymentLinkUseCase,
} from "@/infrastructure/composition";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { parseXlsx } from "@/shared/utils/parseXlsx";

export interface ImportResult {
  created: number;
  skipped: number;
  withoutPaymentLink: number;
  errors: { row: number; message: string }[];
}

export interface ImportGiftsActionState {
  status: "idle" | "done" | "error";
  result?: ImportResult;
  message?: string;
}

function parseBrazilianDecimal(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.includes(",")) {
    // Comma decimal separator (Brazilian format): strip thousands dots, then comma -> dot.
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed);
}

/** Exported for testing: processes already-parsed rows against injected repository/use-cases. */
export async function importGiftRows(
  rows: { [column: string]: string }[],
  giftRepository: Pick<GiftRepository, "findAll">,
  upsertGiftUseCase: Pick<UpsertGiftUseCase, "execute">,
  refreshGiftPaymentLinkUseCase: Pick<RefreshGiftPaymentLinkUseCase, "execute">
): Promise<ImportResult> {
  const existingNames = new Set((await giftRepository.findAll()).map((gift) => gift.name.toLowerCase()));
  const result: ImportResult = { created: 0, skipped: 0, withoutPaymentLink: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row["Nome"] ?? "").trim();
    const description = (row["Descrição"] ?? "").trim();
    const category = (row["Categoria"] ?? "").trim();
    const rawValor = (row["Valor"] ?? "").trim();

    if (existingNames.has(name.toLowerCase())) {
      result.skipped++;
      continue;
    }

    const price = parseBrazilianDecimal(rawValor);
    if (!Number.isFinite(price) || price <= 0) {
      result.errors.push({ row: i, message: "Verifique o valor informado." });
      continue;
    }

    if (name.length < 2 || description.length < 3 || category.length < 2) {
      result.errors.push({ row: i, message: "Verifique nome, descrição e categoria." });
      continue;
    }

    const { gift } = await upsertGiftUseCase.execute({ name, description, category, price, imageUrl: null });
    existingNames.add(name.toLowerCase());
    result.created++;

    try {
      await refreshGiftPaymentLinkUseCase.execute(gift);
    } catch {
      result.withoutPaymentLink++;
    }
  }

  return result;
}

export async function importGiftsAction(
  _prevState: ImportGiftsActionState,
  formData: FormData
): Promise<ImportGiftsActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo Excel (.xlsx)." };
  }

  const fileBuffer = await file.arrayBuffer();
  const rows = await parseXlsx(fileBuffer);

  try {
    const result = await importGiftRows(
      rows,
      { findAll: () => createListGiftsUseCase().execute() },
      createUpsertGiftUseCase(),
      createRefreshGiftPaymentLinkUseCase()
    );
    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/presentes/novo");
    revalidatePath("/admin/dashboard");
    return { status: "done", result };
  } catch {
    return { status: "error", message: "Não foi possível importar os presentes agora." };
  }
}

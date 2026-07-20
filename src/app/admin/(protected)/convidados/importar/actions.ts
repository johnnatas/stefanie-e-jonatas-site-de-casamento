"use server";

import { createCreateGuestUseCase, createListGuestsUseCase } from "@/infrastructure/composition";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { parseCsv } from "@/shared/utils/parseCsv";

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface ImportGuestsActionState {
  status: "idle" | "done" | "error";
  result?: ImportResult;
  message?: string;
}

/** Exported for testing: processes already-parsed rows against injected repository/use-case. */
export async function importGuestRows(
  rows: { [column: string]: string }[],
  guestRepository: Pick<GuestRepository, "findAll">,
  createGuestUseCase: Pick<CreateGuestUseCase, "execute">
): Promise<ImportResult> {
  const existingNames = new Set((await guestRepository.findAll()).map((guest) => guest.fullName.toLowerCase()));
  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fullName = (row["Nome completo"] ?? "").trim();
    const nickname = (row["Apelido"] ?? "").trim() || undefined;

    if (existingNames.has(fullName.toLowerCase())) {
      result.skipped++;
      continue;
    }

    if (fullName.length < 3) {
      result.errors.push({ row: i + 1, message: "Verifique o nome completo (mínimo 3 caracteres)." });
      continue;
    }

    await createGuestUseCase.execute({ fullName, nickname });
    existingNames.add(fullName.toLowerCase());
    result.created++;
  }

  return result;
}

export async function importGuestsAction(
  _prevState: ImportGuestsActionState,
  formData: FormData
): Promise<ImportGuestsActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo CSV." };
  }

  const fileContent = await file.text();
  const rows = parseCsv(fileContent);

  try {
    const result = await importGuestRows(rows, { findAll: () => createListGuestsUseCase().execute() }, createCreateGuestUseCase());
    return { status: "done", result };
  } catch {
    return { status: "error", message: "Não foi possível importar os convidados agora." };
  }
}

import { describe, expect, it } from "vitest";
import { importGuestRows } from "@/app/admin/(protected)/convidados/importar/actions";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { Guest } from "@/domain/entities/Guest";

describe("importGuestRows", () => {
  it("creates guests from valid rows", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new CreateGuestUseCase(repository);

    const result = await importGuestRows(
      [
        { "Nome completo": "Ana Silva", Apelido: "Aninha" },
        { "Nome completo": "Bruno Costa", Apelido: "" },
      ],
      repository,
      useCase
    );

    expect(result).toEqual({ created: 2, skipped: 0, errors: [] });
    expect((await repository.findAll()).map((g) => g.fullName)).toEqual(["Ana Silva", "Bruno Costa"]);
  });

  it("skips rows matching an existing guest name (case-insensitive)", async () => {
    const repository = new InMemoryGuestRepository();
    await repository.save(Guest.create({ fullName: "Ana Silva", companionsCount: 0, attendanceStatus: "pending" }));
    const useCase = new CreateGuestUseCase(repository);

    const result = await importGuestRows([{ "Nome completo": "ana silva", Apelido: "" }], repository, useCase);

    expect(result).toEqual({ created: 0, skipped: 1, errors: [] });
  });

  it("reports a per-row error for invalid data without stopping the import", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new CreateGuestUseCase(repository);

    const result = await importGuestRows(
      [
        { "Nome completo": "Al", Apelido: "" },
        { "Nome completo": "Carla Nunes", Apelido: "" },
      ],
      repository,
      useCase
    );

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([{ row: 1, message: "Verifique o nome completo (mínimo 3 caracteres)." }]);
  });
});

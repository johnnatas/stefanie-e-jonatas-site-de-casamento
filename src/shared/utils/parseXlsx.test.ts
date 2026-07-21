import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseXlsx } from "@/shared/utils/parseXlsx";

async function buildWorkbookBuffer(rows: (string | number)[][]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  rows.forEach((row) => worksheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

describe("parseXlsx", () => {
  it("parses a simple sheet with a header row", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Nome completo", "Apelido"],
      ["Ana Silva", "Aninha"],
      ["Bruno Costa", "Bruno"],
    ]);

    const rows = await parseXlsx(buffer);

    expect(rows).toEqual([
      { "Nome completo": "Ana Silva", Apelido: "Aninha" },
      { "Nome completo": "Bruno Costa", Apelido: "Bruno" },
    ]);
  });

  it("preserves accented characters correctly", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Nome completo", "Apelido"],
      ["Lucas Santos", "Mão"],
      ["José da Conceição", "Zé"],
    ]);

    const rows = await parseXlsx(buffer);

    expect(rows).toEqual([
      { "Nome completo": "Lucas Santos", Apelido: "Mão" },
      { "Nome completo": "José da Conceição", Apelido: "Zé" },
    ]);
  });

  it("converts numeric cells to their string representation", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Nome", "Valor"],
      ["Jogo de panelas", 450.9],
    ]);

    const rows = await parseXlsx(buffer);

    expect(rows).toEqual([{ Nome: "Jogo de panelas", Valor: "450.9" }]);
  });

  it("skips fully blank rows", async () => {
    const buffer = await buildWorkbookBuffer([
      ["Nome completo", "Apelido"],
      ["Ana Silva", "Aninha"],
      ["", ""],
    ]);

    const rows = await parseXlsx(buffer);

    expect(rows).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/utils/parseCsv";

describe("parseCsv", () => {
  it("parses a simple CSV with a header row", () => {
    const rows = parseCsv("Nome completo,Apelido\nAna Silva,Aninha\nBruno Costa,Bruno");

    expect(rows).toEqual([
      { "Nome completo": "Ana Silva", Apelido: "Aninha" },
      { "Nome completo": "Bruno Costa", Apelido: "Bruno" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('Nome completo,Apelido\n"Silva, Ana",Aninha');

    expect(rows).toEqual([{ "Nome completo": "Silva, Ana", Apelido: "Aninha" }]);
  });

  it("strips a UTF-8 BOM prefix", () => {
    const bom = "﻿";
    const rows = parseCsv(`${bom}Nome completo,Apelido\nAna Silva,Aninha`);

    expect(rows).toEqual([{ "Nome completo": "Ana Silva", Apelido: "Aninha" }]);
  });

  it("skips fully blank rows", () => {
    const rows = parseCsv("Nome completo,Apelido\nAna Silva,Aninha\n\n");

    expect(rows).toHaveLength(1);
  });
});

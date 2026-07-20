import ExcelJS from "exceljs";

export interface ParsedSheetRow {
  [column: string]: string;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((fragment) => fragment.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
    return "";
  }

  return String(value).trim();
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedSheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value);
  });

  const rows: ParsedSheetRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const values: ParsedSheetRow = {};
    let hasContent = false;

    headers.forEach((header, colNumber) => {
      if (!header) return;
      const raw = cellToString(row.getCell(colNumber).value);
      values[header] = raw;
      if (raw) hasContent = true;
    });

    if (hasContent) {
      rows.push(values);
    }
  }

  return rows;
}

import Papa from "papaparse";

export interface ParsedCsvRow {
  [column: string]: string;
}

export function parseCsv(fileContent: string): ParsedCsvRow[] {
  const result = Papa.parse<ParsedCsvRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  return result.data;
}

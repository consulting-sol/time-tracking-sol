/**
 * Excel exports (ExcelJS, loaded lazily so it doesn't bloat the main bundle).
 *
 * 1. exportArbeitsrapport  – fills the HSG "Campus Credits Arbeitsrapport" template
 *                            (public/arbeitsrapport-template.xlsx) with a user's own entries.
 * 2. exportEntriesTable    – generic, styled list of entries with optional grouping + totals
 *                            (admin export).
 */

export interface ExportEntry {
  date: string; // yyyy-mm-dd
  hours: number;
  description: string;
  projectName?: string;
  clientName?: string;
  userDisplayName?: string;
}

// Sheet names in the template, index = month (0 = January)
const MONTH_SHEETS = ["Jan", "Feb", "März", "April", "Mai", "Juni", "Juli", "Aug", "Sept", "Okt", "Nov", "Dez"];
const MONTH_NAMES_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const FIRST_DAY_ROW = 11; // row of "1. <Monat>"
const MAX_DAY_ROW = 41;   // row of "31. <Monat>"

// exceljs is CommonJS; depending on the bundler the namespace or its `default` holds the API.
async function loadExcelJS(): Promise<typeof import("exceljs")> {
  const mod = (await import("exceljs")) as unknown as { default?: typeof import("exceljs") } & typeof import("exceljs");
  return mod.default && "Workbook" in mod.default ? mod.default : mod;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "2025-09" -> { y: 2025, m: 8 } */
function parseMonth(ym: string): { y: number; m: number } {
  const [y, m] = ym.split("-").map(Number);
  return { y, m: m - 1 };
}

export interface ArbeitsrapportOptions {
  entries: ExportEntry[];
  studentName: string;
  projectName: string;
  projectYear: string; // free text, e.g. "2025/2026"
  lecturerName: string;
  fromMonth: string; // "yyyy-mm"
  toMonth: string;   // "yyyy-mm"
  templateUrl?: string;
}

export async function exportArbeitsrapport(opts: ArbeitsrapportOptions): Promise<void> {
  const templateUrl = opts.templateUrl ?? `${import.meta.env.BASE_URL.replace(/\/$/, "")}/arbeitsrapport-template.xlsx`;
  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error(`Template konnte nicht geladen werden (${res.status})`);
  const buffer = await buildArbeitsrapport(opts, await res.arrayBuffer());
  const safeName = opts.studentName.replace(/[^\w\-]+/g, "_");
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `Arbeitsrapport_${safeName}_${opts.fromMonth}_${opts.toMonth}.xlsx`,
  );
}

/** Pure part: fills the template (given as ArrayBuffer) and returns the resulting xlsx bytes. */
export async function buildArbeitsrapport(opts: ArbeitsrapportOptions, template: ArrayBuffer): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(template);

  const from = parseMonth(opts.fromMonth);
  const to = parseMonth(opts.toMonth);
  const fromIdx = from.y * 12 + from.m;
  const toIdx = to.y * 12 + to.m;
  if (toIdx < fromIdx) throw new Error("Der Endmonat liegt vor dem Startmonat.");
  if (toIdx - fromIdx > 11) throw new Error("Der Zeitraum darf höchstens 12 Monate umfassen.");

  // Which calendar year does each month (0-11) of the template belong to?
  // Months inside the range take their real year; months outside continue the sequence
  // so the summary sheet still reads sensibly (e.g. Sep 25 … Aug 26).
  const yearForMonth = (m: number): number => {
    const sameYear = from.y === to.y;
    if (sameYear) return from.y;
    return m >= from.m ? from.y : to.y;
  };

  // ---- Summary sheet ----
  const total = wb.getWorksheet("Total Aufwand");
  if (!total) throw new Error("Vorlage: Blatt 'Total Aufwand' fehlt");
  total.getCell("E2").value = opts.projectName;
  total.getCell("E4").value = opts.projectYear;
  total.getCell("E6").value = opts.studentName;
  total.getCell("F8").value = opts.lecturerName || null;
  for (let m = 0; m < 12; m++) {
    // C15..C26 carry the month label (number format "mmmm yy"); month sheets reference them.
    const cell = total.getCell(`C${15 + m}`);
    cell.value = new Date(Date.UTC(yearForMonth(m), m, 1));
    cell.numFmt = "mmmm yy";
  }

  // ---- Group entries by month/day ----
  type DayAgg = { hours: number; descriptions: string[] };
  const byMonth = new Map<number, Map<number, DayAgg>>(); // monthIdx(y*12+m) -> day -> agg
  for (const e of opts.entries) {
    const { y, m, d } = parseIsoDate(e.date);
    const idx = y * 12 + m;
    if (idx < fromIdx || idx > toIdx) continue;
    if (!byMonth.has(idx)) byMonth.set(idx, new Map());
    const days = byMonth.get(idx)!;
    const agg = days.get(d) ?? { hours: 0, descriptions: [] };
    agg.hours += Number(e.hours) || 0;
    const desc = (e.description ?? "").trim();
    if (desc && !agg.descriptions.includes(desc)) agg.descriptions.push(desc);
    days.set(d, agg);
  }

  // ---- Month sheets ----
  for (let m = 0; m < 12; m++) {
    const ws = wb.getWorksheet(MONTH_SHEETS[m]);
    if (!ws) continue;
    ws.getCell("B2").value = opts.studentName;
    ws.getCell("D2").value = opts.projectName;

    const year = yearForMonth(m);
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    // Clear sample data and make sure every day row has a label (29. Februar in leap years)
    for (let row = FIRST_DAY_ROW; row <= MAX_DAY_ROW; row++) {
      const day = row - FIRST_DAY_ROW + 1;
      ws.getCell(`C${row}`).value = null;
      ws.getCell(`D${row}`).value = null;
      const label = ws.getCell(`B${row}`);
      if (day <= daysInMonth) {
        if (!label.value) label.value = `${day}. ${MONTH_NAMES_DE[m]}`;
      } else if (typeof label.value === "string" && /^\d+\. /.test(label.value)) {
        label.value = null;
      }
    }

    const days = byMonth.get(year * 12 + m);
    if (!days) continue;
    for (const [day, agg] of days) {
      if (day < 1 || day > daysInMonth) continue;
      const row = FIRST_DAY_ROW + day - 1;
      if (row > MAX_DAY_ROW) continue;
      ws.getCell(`C${row}`).value = Math.round(agg.hours * 100) / 100;
      ws.getCell(`D${row}`).value = agg.descriptions.join("; ");
    }
  }

  // Excel recalculates formulas on open
  wb.calcProperties.fullCalcOnLoad = true;

  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

export type EntriesGroupBy = "none" | "project" | "client" | "consultant";

export interface EntriesTableOptions {
  entries: ExportEntry[];
  groupBy: EntriesGroupBy;
  title: string;
  subtitle?: string; // e.g. active filters
  filename: string;
}

export async function exportEntriesTable(opts: EntriesTableOptions): Promise<void> {
  const buffer = await buildEntriesTable(opts);
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    opts.filename,
  );
}

/** Pure part: builds the workbook and returns the xlsx bytes. */
export async function buildEntriesTable(opts: EntriesTableOptions): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Time Tracker";
  const ws = wb.addWorksheet("Time Entries", { views: [{ state: "frozen", ySplit: 4 }] });

  const columns: { header: string; key: keyof ExportEntry; width: number }[] = [
    { header: "Datum", key: "date", width: 12 },
    { header: "Consultant", key: "userDisplayName", width: 22 },
    { header: "Projekt", key: "projectName", width: 30 },
    { header: "Kunde", key: "clientName", width: 22 },
    { header: "Beschreibung", key: "description", width: 60 },
    { header: "Stunden", key: "hours", width: 10 },
  ];
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  // Title block
  ws.mergeCells(1, 1, 1, columns.length);
  ws.getCell("A1").value = opts.title;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell("A2").value = opts.subtitle ?? "";
  ws.getCell("A2").font = { color: { argb: "FF6B7280" }, size: 10 };

  // Header row (row 4)
  const header = ws.getRow(4);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    cell.border = { bottom: { style: "thin" } };
  });
  header.getCell(columns.length).alignment = { horizontal: "right" };

  const hoursCol = columns.length;
  const dateCol = 1;

  const groupKey = (e: ExportEntry): string =>
    opts.groupBy === "project" ? (e.projectName || "Unbekanntes Projekt") :
    opts.groupBy === "client" ? (e.clientName || "Kein Kunde") :
    opts.groupBy === "consultant" ? (e.userDisplayName || "Unbekannt") :
    "";

  const groups = new Map<string, ExportEntry[]>();
  for (const e of opts.entries) {
    const k = groupKey(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  const dataRows: number[] = [];
  const subtotalRefs: string[] = [];
  const addEntryRow = (e: ExportEntry) => {
    const { y, m, d } = parseIsoDate(e.date);
    const row = ws.addRow({
      date: new Date(Date.UTC(y, m, d)),
      userDisplayName: e.userDisplayName ?? "",
      projectName: e.projectName ?? "",
      clientName: e.clientName ?? "",
      description: e.description ?? "",
      hours: Number(e.hours) || 0,
    });
    row.getCell(dateCol).numFmt = "dd.mm.yyyy";
    row.getCell(hoursCol).numFmt = "0.00";
    row.getCell(5).alignment = { wrapText: true, vertical: "top" };
    dataRows.push(row.number);
  };

  if (opts.groupBy === "none") {
    opts.entries.forEach(addEntryRow);
  } else {
    for (const [name, list] of groups) {
      const hdr = ws.addRow([name]);
      ws.mergeCells(hdr.number, 1, hdr.number, columns.length - 1);
      hdr.getCell(1).font = { bold: true };
      hdr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      hdr.getCell(hoursCol).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

      const first = ws.rowCount + 1;
      list.forEach(addEntryRow);
      const last = ws.rowCount;

      const sub = ws.addRow([]);
      sub.getCell(columns.length - 1).value = `Subtotal ${name}`;
      sub.getCell(columns.length - 1).font = { italic: true };
      sub.getCell(columns.length - 1).alignment = { horizontal: "right" };
      const subCell = sub.getCell(hoursCol);
      subCell.value = { formula: `SUM(${colLetter(hoursCol)}${first}:${colLetter(hoursCol)}${last})` };
      subCell.numFmt = "0.00";
      subCell.font = { italic: true, bold: true };
      subCell.border = { top: { style: "thin" } };
      subtotalRefs.push(`${colLetter(hoursCol)}${sub.number}`);
      ws.addRow([]);
    }
  }

  // Grand total: flat list -> sum of the entry rows; grouped -> sum of the subtotals
  const totalRow = ws.addRow([]);
  totalRow.getCell(columns.length - 1).value = "Total";
  totalRow.getCell(columns.length - 1).font = { bold: true };
  totalRow.getCell(columns.length - 1).alignment = { horizontal: "right" };
  const totalCell = totalRow.getCell(hoursCol);
  const h = colLetter(hoursCol);
  let totalFormula: string | null = null;
  if (opts.groupBy === "none" && dataRows.length) {
    totalFormula = `SUM(${h}${dataRows[0]}:${h}${dataRows[dataRows.length - 1]})`;
  } else if (subtotalRefs.length) {
    totalFormula = `SUM(${subtotalRefs.join(",")})`;
  }
  totalCell.value = totalFormula ? { formula: totalFormula } : 0;
  totalCell.numFmt = "0.00";
  totalCell.font = { bold: true };
  totalCell.border = { top: { style: "double" } };

  const entriesCount = ws.addRow([]);
  entriesCount.getCell(columns.length - 1).value = "Einträge";
  entriesCount.getCell(columns.length - 1).alignment = { horizontal: "right" };
  entriesCount.getCell(hoursCol).value = opts.entries.length;

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };
  wb.calcProperties.fullCalcOnLoad = true;

  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

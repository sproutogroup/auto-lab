import * as XLSX from "xlsx";

export type InvoiceApiData = {
  id: number;
  invoice_no: string;
  tax_point: string | null;
  check_no: string | null;
  invoice_name_address: string | null;
  collection_address: string | null;
  issued_by: string | null;
  invoiced_by: string | null;
  inspection_image_url: string | null;
  make: string | null;
  model: string | null;
  chassis_no: string | null;
  registration: string | null;
  purchased_by: string | null;

  mot_end: string | Date | null;
  mileage: number | null;
  dor: string | null;
  colour: string | null;
  interior_colour: string | null;
  purchase_date: string | Date | null;
  collection_date: string | Date | null;

  bank_name: string | null;
  account_number: string | null;
  sort_code: string | null;
  ref: string | null;
  acc_name: string | null;
  sub_total: string | null;
  vat_at_20: string | null;
  total: string | null;
  deposit_paid: string | null;
  balance_due: string | null;
  description_of_goods: string | null;
  notes: string | null;

  upload_date: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

const formatDate = (value: string | Date | null): string => {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleDateString("en-GB");
  // e.g. "2025-12-10T00:00:00.000Z" → "2025-12-10"
  if (typeof value === "string") {
    const parts = value.split("T");
    return parts[0] || value;
  }
  return String(value);
};

const asNumber = (value: string | number | null): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const setString = (ws: XLSX.WorkSheet, addr: string, v: string | null | undefined) => {
  ws[addr] = { t: "s", v: v ?? "" };
};

const setNumber = (ws: XLSX.WorkSheet, addr: string, v: string | number | null) => {
  const num = asNumber(v);
  if (num === undefined) return;
  ws[addr] = { t: "n", v: num };
};

const fillAddressLines = (
  ws: XLSX.WorkSheet,
  baseCol: string,
  startRow: number,
  value: string | null | undefined,
  maxLines: number
) => {
  if (!value) return;
  const lines = value.split(/\r?\n/).filter((l) => l.trim() !== "");
  for (let i = 0; i < maxLines; i++) {
    const line = lines[i];
    if (!line) break;
    const addr = `${baseCol}${startRow + i}`;
    ws[addr] = { t: "s", v: line };
  }
};

export async function generateInvoiceExcel(invoiceData: InvoiceApiData) {
  // 1. Fetch the template as an ArrayBuffer
  const templateResponse = await fetch("/invoice-template-excel.xlsx");
  const arrayBuffer = await templateResponse.arrayBuffer();

  // 2. Read workbook from template
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];

  // ========================
  // Top section
  // ========================

  // A1 = "Invoice No:" (label), actual value in C1
  setString(ws, "C1", invoiceData.invoice_no);

  // A2 = "Tax Point:", default "N/A" in C2
  setString(ws, "C2", invoiceData.tax_point ?? "N/A");

  // Stock No (A3 label, C3 = "=C1") – already linked to C1, leave formula.

  // "Invoice to:" address block = A7:A11
  fillAddressLines(ws, "A", 7, invoiceData.invoice_name_address, 5);

  // "Delivered To:" address block = F7:F11
  // Template currently mirrors A7:A11 with formulas.
  // If collection_address exists, override those formulas with explicit values.
  if (invoiceData.collection_address) {
    fillAddressLines(ws, "F", 7, invoiceData.collection_address, 5);
  }

  // Raised By / Invoiced By (row 15)
  // A15 = "Raised By:", C15 currently "Adam"
  if (invoiceData.issued_by) {
    setString(ws, "C15", invoiceData.issued_by);
  }
  // F15 = "Invoiced By:", G15 currently "Adam"
  if (invoiceData.invoiced_by) {
    setString(ws, "G15", invoiceData.invoiced_by);
  }

  // ========================
  // Vehicle details block
  // ========================

  // Row 17: A17 "Make", C17 "Model", E17 "Chassis No.", G17 "Registration"
  // We'll put values in B17, D17, F17, H17
  setString(ws, "B17", invoiceData.make);
  setString(ws, "D17", invoiceData.model);
  setString(ws, "F17", invoiceData.chassis_no);
  setString(ws, "H17", invoiceData.registration);

  // Row 19: A19 "Sold By", C19 "MOT Expiry", E19 "Mileage", G19 "Date Of Registration"
  // Values in B19, D19, F19, H19
  setString(ws, "B19", invoiceData.purchased_by); // or issued_by if you prefer
  setString(ws, "D19", formatDate(invoiceData.mot_end));
  if (invoiceData.mileage !== null && invoiceData.mileage !== undefined) {
    ws["F19"] = { t: "n", v: invoiceData.mileage };
  }
  setString(ws, "H19", invoiceData.dor);

  // Row 21: A21 "Colour", C21 "Int Colour", E21 "Sale Date", G21 "Collection Date"
  // Values in B21, D21, F21, H21
  setString(ws, "B21", invoiceData.colour);
  setString(ws, "D21", invoiceData.interior_colour);
  setString(ws, "F21", formatDate(invoiceData.purchase_date));
  setString(ws, "H21", formatDate(invoiceData.collection_date));

  // ========================
  // Description of Goods
  // ========================

  // The template uses:
  //   A17 label "Make", actual description goes in C18, and B26 has formula "=C18"
  setString(ws, "C18", invoiceData.description_of_goods);

  // ========================
  // Bank / Payment details
  // ========================

  // Row 46..52 labels in col A, values in B
  // Row 46: "Bank:" -> B46
  setString(ws, "B46", invoiceData.bank_name);
  // Row 47: "Account Name:" -> B47
  setString(ws, "B47", invoiceData.acc_name);
  // Row 48: "Sort Code:" -> B48
  setString(ws, "B48", invoiceData.sort_code);
  // Row 49: "Account Number:" -> B49
  setString(ws, "B49", invoiceData.account_number);
  // Row 52: "REFERENCE" -> B52
  setString(ws, "B52", invoiceData.ref);

  // ========================
  // Totals section (right side)
  // ========================

  // F45 = "Subtotal", G45 has formula "=SUM(G26:G40)" in template.
  // If backend already has monetary fields, you can override formulas here:
  if (invoiceData.sub_total) setNumber(ws, "G45", invoiceData.sub_total);
  if (invoiceData.vat_at_20) setNumber(ws, "G46", invoiceData.vat_at_20);
  if (invoiceData.total) setNumber(ws, "G48", invoiceData.total);
  if (invoiceData.deposit_paid) setNumber(ws, "G49", invoiceData.deposit_paid);
  if (invoiceData.balance_due) setNumber(ws, "G52", invoiceData.balance_due);

  // ========================
  // Footer date
  // ========================

  // A57 currently "Date: 06/10/2020" – make it dynamic
  const invoiceDate =
    formatDate(invoiceData.tax_point) || formatDate(invoiceData.created_at);
  if (invoiceDate) {
    setString(ws, "A57", `Date: ${invoiceDate}`);
  }

  // ========================
  // Generate and download
  // ========================

  const outBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([outBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${invoiceData.invoice_no}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  // If you want to upload to backend instead, you can wrap `blob` into `File`
  // and POST it via FormData like you already do with your PDF.
}

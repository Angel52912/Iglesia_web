import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { formatMoney } from './reports.service.js';
import type { ReportCell, ReportColumn, ReportTable } from './reports.types.js';

const MARGIN = 40;
const ROW_HEIGHT = 18;

function displayCell(cell: ReportCell, column: ReportColumn): string {
  if (cell === null) return '';
  if (typeof cell === 'string') return cell;
  if (column.kind === 'money') return formatMoney(cell);
  if (column.kind === 'percent') return `${String(cell)} %`;
  return String(cell);
}

export function toPdf(table: ReportTable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    const width = doc.page.width - MARGIN * 2;
    const columnWidth = width / table.columns.length;
    const cellOptions = { width: columnWidth - 6, lineBreak: false, ellipsis: true };

    const drawHeader = (): void => {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      table.columns.forEach((column, index) => {
        doc.text(column.header, MARGIN + index * columnWidth, y, cellOptions);
      });
      doc.y = y + ROW_HEIGHT;
      doc
        .moveTo(MARGIN, doc.y - 4)
        .lineTo(MARGIN + width, doc.y - 4)
        .stroke();
    };

    doc.font('Helvetica-Bold').fontSize(16).text(table.title);
    if (table.subtitle) doc.font('Helvetica').fontSize(10).text(table.subtitle);
    doc.moveDown(0.5);
    for (const line of table.summary) {
      doc.font('Helvetica').fontSize(10).text(`${line.label}: ${line.value}`);
    }
    doc.moveDown();
    drawHeader();

    for (const row of table.rows) {
      if (doc.y + ROW_HEIGHT > doc.page.height - MARGIN) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      doc.font('Helvetica').fontSize(9);
      table.columns.forEach((column, index) => {
        const text = displayCell(row[index] ?? null, column);
        doc.text(text, MARGIN + index * columnWidth, y, cellOptions);
      });
      doc.y = y + ROW_HEIGHT;
    }
    if (table.rows.length === 0) doc.font('Helvetica').text('Sin registros en este reporte.');
    doc.end();
  });
}

export async function toXlsx(table: ReportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(table.slug);
  sheet.addRow([table.title]).font = { bold: true, size: 14 };
  if (table.subtitle) sheet.addRow([table.subtitle]);
  for (const line of table.summary) sheet.addRow([line.label, line.value]);
  sheet.addRow([]);

  const header = sheet.addRow(table.columns.map((column) => column.header));
  header.font = { bold: true };
  for (const row of table.rows) sheet.addRow(table.columns.map((_, index) => row[index] ?? null));

  // El formato numérico solo se aplica a las filas de datos (los totales de arriba son texto).
  table.columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = Math.max(18, column.header.length + 4);
    const numFmt =
      column.kind === 'money' ? '"$"#,##0.00' : column.kind === 'percent' ? '0.0"%"' : null;
    if (numFmt === null) return;
    for (let rowNumber = header.number + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      sheet.getRow(rowNumber).getCell(index + 1).numFmt = numFmt;
    }
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

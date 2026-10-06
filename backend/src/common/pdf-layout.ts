import { join } from 'path';
import PDFDocument from 'pdfkit';

const LOGO_PATH = join(__dirname, '..', 'assets', 'hb-logo.png');

// Encabezado común a los comprobantes del negocio (remito de pedido,
// comprobante de recarga): logo, nombre, título y leyenda de que no es una
// factura fiscal. Devuelve el documento listo para seguir escribiendo.
export function startBusinessDocument(
  title: string,
  legend: string,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  try {
    doc.image(LOGO_PATH, 50, 45, { width: 42 });
  } catch {
    // el logo es solo decorativo: si no está presente, se omite sin romper el PDF
  }
  doc.fontSize(18).text('HB Servicios', 102, 50, { align: 'left' });
  doc
    .fontSize(10)
    .fillColor('#555')
    .text('Venta y distribución de gas envasado y matafuegos', 102, doc.y);
  doc.fillColor('#000').moveDown(1.5);
  doc.x = 50;

  doc.fillColor('#000').fontSize(14).text(title);
  doc.fontSize(9).fillColor('#555').text(legend);
  doc.fillColor('#000').moveDown(1);
  doc.fontSize(10);

  return doc;
}

export function money(value: string | number): string {
  return `$${Number(value).toLocaleString('es-AR')}`;
}

// Línea horizontal gris de lado a lado del área útil.
export function rule(doc: PDFKit.PDFDocument): void {
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
}

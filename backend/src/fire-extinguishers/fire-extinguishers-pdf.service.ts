import { Injectable } from '@nestjs/common';
import { FireExtinguisher } from './entities/fire-extinguisher.entity';
import { money, rule, startBusinessDocument } from '../common/pdf-layout';

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('es-AR');
}

@Injectable()
export class FireExtinguishersPdfService {
  buildComprobante(fe: FireExtinguisher): PDFKit.PDFDocument {
    const doc = startBusinessDocument(
      `Comprobante de recarga de matafuegos N° ${fe.id}`,
      'Este comprobante es interno y no reemplaza a una factura fiscal.',
    );

    doc.text(`Fecha de recarga: ${formatDate(fe.soldAt)}`);
    doc.text(`Cliente: ${fe.client.name}`);
    if (fe.client.address) doc.text(`Dirección: ${fe.client.address}`);
    doc.font('Helvetica-Bold').text(`Próximo vencimiento: ${formatDate(fe.expiresAt)}`);
    doc.font('Helvetica').moveDown(1);

    const tableTop = doc.y;
    const columns = { product: 50, quantity: 280, unitPrice: 350, subtotal: 440 };

    doc
      .font('Helvetica-Bold')
      .text('Matafuego', columns.product, tableTop)
      .text('Cant.', columns.quantity, tableTop)
      .text('Precio unit.', columns.unitPrice, tableTop)
      .text('Subtotal', columns.subtotal, tableTop);
    doc.font('Helvetica').moveDown(0.5);
    rule(doc);
    doc.moveDown(0.5);

    for (const item of fe.items) {
      const rowY = doc.y;
      doc
        .text(item.product?.name ?? '-', columns.product, rowY, { width: 220 })
        .text(String(item.quantity), columns.quantity, rowY)
        .text(item.unitPrice !== null ? money(item.unitPrice) : '-', columns.unitPrice, rowY)
        .text(item.subtotal !== null ? money(item.subtotal) : '-', columns.subtotal, rowY);
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);
    rule(doc);
    doc.moveDown(0.5);

    const totalUnits = fe.items.reduce((sum, item) => sum + item.quantity, 0);
    doc.x = 50;
    doc.text(`Matafuegos recargados: ${totalUnits}`, { align: 'right' });
    if (fe.amount !== null) {
      doc.font('Helvetica-Bold').fontSize(12).text(`Total: ${money(fe.amount)}`, {
        align: 'right',
      });
      doc.font('Helvetica').fontSize(10);
    }

    if (fe.notes) {
      doc.moveDown(1);
      doc.x = 50;
      doc.fillColor('#555').text(`Observaciones: ${fe.notes}`);
      doc.fillColor('#000');
    }

    return doc;
  }
}

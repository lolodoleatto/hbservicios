import { Injectable } from '@nestjs/common';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { Order } from './entities/order.entity';

const LOGO_PATH = join(__dirname, '..', 'assets', 'hb-logo.png');

@Injectable()
export class OrdersPdfService {
  buildRemito(order: Order): PDFKit.PDFDocument {
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

    doc.fillColor('#000').fontSize(14).text(`Remito interno N° ${order.orderNumber}`);
    doc
      .fontSize(9)
      .fillColor('#555')
      .text(
        'Este comprobante es un remito interno y no reemplaza a una factura fiscal.',
      );
    doc.fillColor('#000').moveDown(1);

    doc.fontSize(10);
    doc.text(`Fecha: ${order.createdAt.toLocaleDateString('es-AR')}`);
    doc.text(`Cliente: ${order.client?.name ?? 'Consumidor final'}`);
    doc.moveDown(1);

    const tableTop = doc.y;
    const columns = {
      product: 50,
      quantity: 280,
      unitPrice: 350,
      subtotal: 440,
    };

    doc
      .font('Helvetica-Bold')
      .text('Producto', columns.product, tableTop)
      .text('Cant.', columns.quantity, tableTop)
      .text('Precio unit.', columns.unitPrice, tableTop)
      .text('Subtotal', columns.subtotal, tableTop);
    doc.font('Helvetica');
    doc.moveDown(0.5);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#ccc')
      .stroke();
    doc.moveDown(0.5);

    for (const item of order.items) {
      const rowY = doc.y;
      doc
        .text(item.product?.name ?? '-', columns.product, rowY, { width: 220 })
        .text(String(item.quantity), columns.quantity, rowY)
        .text(`$${Number(item.unitPrice).toLocaleString('es-AR')}`, columns.unitPrice, rowY)
        .text(`$${Number(item.subtotal).toLocaleString('es-AR')}`, columns.subtotal, rowY);
      if (item.expiresAt) {
        doc
          .fontSize(8)
          .fillColor('#555')
          .text(
            `Vence: ${new Date(item.expiresAt).toLocaleDateString('es-AR')}`,
            columns.product,
            doc.y,
          );
        doc.fillColor('#000').fontSize(10);
      }
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold');
    doc.text(`Descuento: $${Number(order.discount).toLocaleString('es-AR')}`, {
      align: 'right',
    });
    if (Number(order.shippingCost) > 0) {
      doc.text(
        `Costo de envío: $${Number(order.shippingCost).toLocaleString('es-AR')}`,
        { align: 'right' },
      );
    }
    doc.fontSize(12).text(`Total: $${Number(order.total).toLocaleString('es-AR')}`, {
      align: 'right',
    });
    doc.font('Helvetica').fontSize(10);

    return doc;
  }
}

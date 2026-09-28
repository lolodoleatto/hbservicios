"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersPdfService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const pdfkit_1 = __importDefault(require("pdfkit"));
const LOGO_PATH = (0, path_1.join)(__dirname, '..', 'assets', 'hb-logo.png');
let OrdersPdfService = class OrdersPdfService {
    buildRemito(order) {
        const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        try {
            doc.image(LOGO_PATH, 50, 45, { width: 42 });
        }
        catch {
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
            .text('Este comprobante es un remito interno y no reemplaza a una factura fiscal.');
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
                    .text(`Vence: ${new Date(item.expiresAt).toLocaleDateString('es-AR')}`, columns.product, doc.y);
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
            doc.text(`Costo de envío: $${Number(order.shippingCost).toLocaleString('es-AR')}`, { align: 'right' });
        }
        doc.fontSize(12).text(`Total: $${Number(order.total).toLocaleString('es-AR')}`, {
            align: 'right',
        });
        doc.font('Helvetica').fontSize(10);
        return doc;
    }
};
exports.OrdersPdfService = OrdersPdfService;
exports.OrdersPdfService = OrdersPdfService = __decorate([
    (0, common_1.Injectable)()
], OrdersPdfService);
//# sourceMappingURL=orders-pdf.service.js.map
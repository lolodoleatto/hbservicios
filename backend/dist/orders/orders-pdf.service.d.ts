import { Order } from './entities/order.entity';
export declare class OrdersPdfService {
    buildRemito(order: Order): PDFKit.PDFDocument;
}

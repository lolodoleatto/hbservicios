import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    create(dto: CreateProductDto): Promise<import("./entities/product.entity").Product>;
    findAll(includeInactive?: string): Promise<import("./entities/product.entity").Product[]>;
    findOne(id: number): Promise<import("./entities/product.entity").Product>;
    update(id: number, dto: UpdateProductDto): Promise<import("./entities/product.entity").Product>;
    adjustStock(id: number, dto: AdjustStockDto): Promise<import("./entities/product.entity").Product>;
    deactivate(id: number): Promise<import("./entities/product.entity").Product>;
    remove(id: number): Promise<{
        deleted: true;
    }>;
}

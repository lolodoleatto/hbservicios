import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PriceHistory } from './entities/price-history.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
export declare class ProductsService {
    private readonly productsRepository;
    private readonly priceHistoryRepository;
    private readonly stockMovementsRepository;
    constructor(productsRepository: Repository<Product>, priceHistoryRepository: Repository<PriceHistory>, stockMovementsRepository: Repository<StockMovement>);
    private inferLinkedEmptyProduct;
    create(dto: CreateProductDto): Promise<Product>;
    findAll(includeInactive?: boolean): Promise<Product[]>;
    findOne(id: number): Promise<Product>;
    update(id: number, dto: UpdateProductDto): Promise<Product>;
    adjustStock(id: number, dto: AdjustStockDto, options?: {
        allowPurchase?: boolean;
    }): Promise<Product>;
    deactivate(id: number): Promise<Product>;
    remove(id: number): Promise<{
        deleted: true;
    }>;
}

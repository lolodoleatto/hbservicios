import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    create(dto: CreateSupplierDto): Promise<import("./entities/supplier.entity").Supplier>;
    findAll(includeInactive?: string): Promise<import("./entities/supplier.entity").Supplier[]>;
    findOne(id: number): Promise<import("./entities/supplier.entity").Supplier>;
    update(id: number, dto: UpdateSupplierDto): Promise<import("./entities/supplier.entity").Supplier>;
    deactivate(id: number): Promise<import("./entities/supplier.entity").Supplier>;
}

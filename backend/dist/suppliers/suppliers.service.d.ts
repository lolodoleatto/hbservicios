import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
export declare class SuppliersService {
    private readonly suppliersRepository;
    constructor(suppliersRepository: Repository<Supplier>);
    create(dto: CreateSupplierDto): Promise<Supplier>;
    findAll(includeInactive?: boolean): Promise<Supplier[]>;
    findOne(id: number): Promise<Supplier>;
    update(id: number, dto: UpdateSupplierDto): Promise<Supplier>;
    deactivate(id: number): Promise<Supplier>;
}

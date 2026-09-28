import { FireExtinguishersService } from './fire-extinguishers.service';
import { CreateFireExtinguisherDto } from './dto/create-fire-extinguisher.dto';
export declare class FireExtinguishersController {
    private readonly fireExtinguishersService;
    constructor(fireExtinguishersService: FireExtinguishersService);
    create(dto: CreateFireExtinguisherDto): Promise<import("./entities/fire-extinguisher.entity").FireExtinguisher>;
    findAll(): Promise<import("./entities/fire-extinguisher.entity").FireExtinguisher[]>;
    findOne(id: number): Promise<import("./entities/fire-extinguisher.entity").FireExtinguisher>;
}

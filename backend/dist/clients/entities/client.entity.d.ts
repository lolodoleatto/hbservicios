import { User } from '../../users/entities/user.entity';
export declare class Client {
    id: number;
    name: string;
    phone: string;
    address: string;
    email: string;
    active: boolean;
    user: User | null;
    createdAt: Date;
}

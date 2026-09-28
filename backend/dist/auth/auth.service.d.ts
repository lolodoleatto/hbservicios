import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<User>;
    login(user: User): {
        accessToken: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: import("../users/entities/user.entity").UserRole;
        };
    };
}

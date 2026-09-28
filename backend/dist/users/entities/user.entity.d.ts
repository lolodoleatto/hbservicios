export declare enum UserRole {
    ADMIN = "admin"
}
export declare class User {
    id: number;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
}

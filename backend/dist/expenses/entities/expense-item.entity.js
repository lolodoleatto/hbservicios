"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseItem = void 0;
const typeorm_1 = require("typeorm");
const expense_entity_1 = require("./expense.entity");
const product_entity_1 = require("../../products/entities/product.entity");
let ExpenseItem = class ExpenseItem {
    id;
    expense;
    product;
    quantity;
    unitPrice;
    subtotal;
};
exports.ExpenseItem = ExpenseItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ExpenseItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => expense_entity_1.Expense, (expense) => expense.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", expense_entity_1.Expense)
], ExpenseItem.prototype, "expense", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", product_entity_1.Product)
], ExpenseItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], ExpenseItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", String)
], ExpenseItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", String)
], ExpenseItem.prototype, "subtotal", void 0);
exports.ExpenseItem = ExpenseItem = __decorate([
    (0, typeorm_1.Entity)('expense_items')
], ExpenseItem);
//# sourceMappingURL=expense-item.entity.js.map
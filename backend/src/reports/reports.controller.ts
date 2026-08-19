import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @Get('sales')
  sales(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.salesReport(from, to);
  }

  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @Get('stock-movements')
  stockMovements(
    @Query('productId') productId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.stockMovements(
      productId ? Number(productId) : undefined,
      from,
      to,
    );
  }

  @ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' })
  @Get('balance')
  balance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.balance(from, to);
  }

  @ApiQuery({
    name: 'daysAhead',
    required: false,
    description: 'Default 30. Incluye también los ya vencidos.',
  })
  @Get('fire-extinguisher-alerts')
  fireExtinguisherAlerts(@Query('daysAhead') daysAhead?: string) {
    return this.reportsService.fireExtinguisherAlerts(
      daysAhead ? Number(daysAhead) : undefined,
    );
  }
}

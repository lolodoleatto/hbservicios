import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ContainerLoan } from './entities/container-loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ContainerLoan])],
  exports: [TypeOrmModule],
})
export class ClientsModule {}

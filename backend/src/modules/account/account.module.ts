import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../entities/employee.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { OperationLogHelper } from '../../common/utils/operation-log.helper';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, OperationLog])],
  controllers: [AccountController],
  providers: [AccountService, OperationLogHelper],
  exports: [AccountService],
})
export class AccountModule {}

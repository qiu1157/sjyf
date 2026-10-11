import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { OperationLogHelper } from '../../common/utils/operation-log.helper';
import { LeaderAdminService } from './leader-admin.service';
import { LeaderAdminController } from './leader-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User, Order, OperationLog])],
  providers: [LeaderAdminService, OperationLogHelper],
  controllers: [LeaderAdminController],
  exports: [LeaderAdminService],
})
export class LeaderAdminModule {}

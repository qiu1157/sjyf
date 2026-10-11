import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Employee } from '../../entities/employee.entity';
import { Order } from '../../entities/order.entity';
import { UserAddress } from '../../entities/user-address.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { OperationLogHelper } from '../../common/utils/operation-log.helper';
import { UserAdminService } from './user-admin.service';
import { UserAdminController } from './user-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee, Order, UserAddress, OperationLog])],
  providers: [UserAdminService, OperationLogHelper],
  controllers: [UserAdminController],
  exports: [UserAdminService],
})
export class UserAdminModule {}

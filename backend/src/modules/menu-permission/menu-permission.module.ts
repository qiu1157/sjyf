import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleMenuPermission } from '../../entities/role-menu-permission.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { OperationLogHelper } from '../../common/utils/operation-log.helper';
import { MenuPermissionService } from './menu-permission.service';
import { MenuPermissionController, MyMenuController } from './menu-permission.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoleMenuPermission, OperationLog])],
  providers: [MenuPermissionService, OperationLogHelper],
  controllers: [MenuPermissionController, MyMenuController],
  exports: [MenuPermissionService],
})
export class MenuPermissionModule {}

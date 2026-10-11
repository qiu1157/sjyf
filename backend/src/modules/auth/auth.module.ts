import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MenuGuard } from '../../common/guards/menu.guard';
import { User } from '../../entities/user.entity';
import { Employee } from '../../entities/employee.entity';
import { MenuPermissionModule } from '../menu-permission/menu-permission.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Employee]), MenuPermissionModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    // 全局守卫顺序：JwtAuthGuard 先执行设置 request.user，MenuGuard 后执行校验菜单可见性
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MenuGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}

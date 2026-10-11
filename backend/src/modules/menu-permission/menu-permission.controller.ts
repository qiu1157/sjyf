import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MenuPermissionService } from './menu-permission.service';
import { Role } from '../../common/constants/roles.constants';

// 角色菜单权限配置（仅系统管理员）
@ApiTags('菜单权限配置')
@Controller('admin/role-menus')
@UseGuards(JwtAuthGuard)
export class MenuPermissionController {
  constructor(private menuService: MenuPermissionService) {}

  @Get(':role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取角色菜单权限配置' })
  getByRole(@Param('role') role: number) {
    return this.menuService.getByRole(+role);
  }

  @Put(':role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '配置角色菜单权限' })
  config(
    @Param('role') role: number,
    @Body() body: { menu_keys: string[] },
    @CurrentUser() user: any,
  ) {
    return this.menuService.config(+role, body.menu_keys, {
      id: user.sub, role: user.role, name: user.name,
    });
  }
}

// 当前账号可见菜单（系统管理员与主管）
@ApiTags('菜单权限配置')
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class MyMenuController {
  constructor(private menuService: MenuPermissionService) {}

  @Get('my-menus')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: '获取当前账号可见菜单' })
  myMenus(@CurrentUser() user: any) {
    return this.menuService.getMenusByRole(user.role);
  }
}

import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserAdminService, WxUserQueryDto, SetLeaderDto } from './user-admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants/roles.constants';

@ApiTags('用户信息管理')
@Controller('admin/users')
export class UserAdminController {
  constructor(private svc: UserAdminService) {}

  // 微信用户列表：系统管理员与主管可访问，归属用户信息菜单
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('users')
  @Get()
  @ApiOperation({ summary: '微信用户列表' })
  list(@Query() q: WxUserQueryDto) {
    return this.svc.list(q);
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('users')
  @Get(':id')
  @ApiOperation({ summary: '微信用户详情' })
  detail(@Param('id') id: number) {
    return this.svc.detail(+id);
  }

  // 将普通用户设置为领队：系统管理员与主管可操作，归属用户信息菜单
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('users')
  @Post(':id/set-leader')
  @ApiOperation({ summary: '将普通用户设置为领队' })
  setLeader(
    @Param('id') id: number,
    @Body() body: SetLeaderDto,
    @CurrentUser() user: any,
  ) {
    return this.svc.setLeader(+id, body, { id: user.sub, role: user.role, name: user.name });
  }

  // 取消领队身份：系统管理员与主管可操作，归属用户信息菜单
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('users')
  @Post(':id/cancel-leader')
  @ApiOperation({ summary: '取消领队身份' })
  cancelLeader(@Param('id') id: number, @CurrentUser() user: any) {
    return this.svc.cancelLeader(+id, { id: user.sub, role: user.role, name: user.name });
  }
}

import { Controller, Get, Put, Query, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants/roles.constants';
import { LeaderAdminService, LeaderQueryDto, UpdateLeaderDto } from './leader-admin.service';

@ApiTags('领队档案管理')
@Controller('admin/leaders')
export class LeaderAdminController {
  constructor(private svc: LeaderAdminService) {}

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('employees')
  @Get()
  @ApiOperation({ summary: '领队档案列表' })
  list(@Query() q: LeaderQueryDto) {
    return this.svc.list(q);
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('employees')
  @Get(':id')
  @ApiOperation({ summary: '领队档案详情' })
  detail(@Param('id') id: number) {
    return this.svc.detail(+id);
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('employees')
  @Put(':id')
  @ApiOperation({ summary: '编辑领队档案' })
  update(@Param('id') id: number, @Body() body: UpdateLeaderDto, @CurrentUser() user: any) {
    return this.svc.update(+id, body, { id: user.sub, role: user.role, name: user.name });
  }

  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Menu('employees')
  @Put(':id/status')
  @ApiOperation({ summary: '启用或禁用领队' })
  toggle(@Param('id') id: number, @CurrentUser() user: any) {
    return this.svc.toggle(+id, { id: user.sub, role: user.role, name: user.name });
  }
}

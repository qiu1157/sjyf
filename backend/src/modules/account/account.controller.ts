import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AccountService, CreateAccountDto, UpdateAccountDto, ResetPasswordDto, ChangePasswordDto, AccountQueryDto } from './account.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants/roles.constants';

@ApiTags('账号管理')
@Controller('admin')
export class AccountController {
  constructor(private svc: AccountService) {}

  // 账号列表：仅系统管理员可访问
  @Roles(Role.ADMIN)
  @Get('accounts')
  @ApiOperation({ summary: '账号列表' })
  list(@Query() q: AccountQueryDto) {
    return this.svc.list(q);
  }

  // 新增账号：仅系统管理员可操作
  @Roles(Role.ADMIN)
  @Post('accounts')
  @ApiOperation({ summary: '新增账号' })
  create(@Body() body: CreateAccountDto, @CurrentUser() user: any) {
    return this.svc.create(body, { id: user.sub, role: user.role, name: user.name });
  }

  // 账号详情
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Get('accounts/:id')
  @ApiOperation({ summary: '账号详情' })
  detail(@Param('id') id: number) {
    return this.svc.detail(+id);
  }

  // 编辑账号信息：系统管理员可编辑任何账号，主管仅可编辑自己
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Put('accounts/:id')
  @ApiOperation({ summary: '编辑账号信息' })
  update(@Param('id') id: number, @Body() body: UpdateAccountDto, @CurrentUser() user: any) {
    return this.svc.update(+id, body, { id: user.sub, role: user.role, name: user.name });
  }

  // 启停账号：仅系统管理员可操作
  @Roles(Role.ADMIN)
  @Put('accounts/:id/status')
  @ApiOperation({ summary: '启停账号' })
  toggle(@Param('id') id: number, @CurrentUser() user: any) {
    return this.svc.toggle(+id, { id: user.sub, role: user.role, name: user.name });
  }

  // 重置其他账号密码：仅系统管理员可操作
  @Roles(Role.ADMIN)
  @Put('accounts/:id/password')
  @ApiOperation({ summary: '重置账号密码' })
  resetPassword(@Param('id') id: number, @Body() body: ResetPasswordDto, @CurrentUser() user: any) {
    return this.svc.resetPassword(+id, body, { id: user.sub, role: user.role, name: user.name });
  }

  // 修改自己的密码：系统管理员与主管可操作
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Put('profile/password')
  @ApiOperation({ summary: '修改自己的密码' })
  changePassword(@Body() body: ChangePasswordDto, @CurrentUser() user: any) {
    return this.svc.changePassword(user.sub, body, { id: user.sub, role: user.role, name: user.name });
  }
}

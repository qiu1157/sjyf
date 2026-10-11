import { Controller, Post, Body, UseGuards, Get, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('认证模块')
@Controller()
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('user/wx-login')
  @ApiOperation({ summary: '用户端微信登录' })
  userLogin(@Body() body: { code: string; nickname?: string; avatar?: string }) {
    return this.authService.wxLogin(body.code, body.nickname, body.avatar);
  }

  // @deprecated 领队登录已统一由 /user/wx-login 识别领队身份，此接口保留兼容旧版小程序
  @Public()
  @Post('leader/wx-login')
  @ApiOperation({ summary: '领队端微信登录（已废弃，请使用 /user/wx-login）' })
  leaderLogin(@Body() body: { code: string }) {
    return this.authService.leaderWxLogin(body.code);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: '管理后台登录' })
  adminLogin(@Body() body: { username: string; password: string }) {
    return this.authService.adminLogin(body.username, body.password);
  }

  // 开发环境兜底登录：按手机号查找/创建用户，生产环境返回 404
  @Public()
  @Post('auth/dev-login')
  @ApiOperation({ summary: '开发环境用户登录（生产环境不可用）' })
  devLogin(@Body() body: { phone: string; nickname?: string }) {
    if (this.authService.isProduction()) {
      throw new NotFoundException();
    }
    return this.authService.devLogin(body.phone, body.nickname);
  }

  @Post('auth/logout')
  @ApiOperation({ summary: '退出登录' })
  logout() {
    // JWT 无服务端态，前端清除 token 即可；接口保留用于未来扩展黑名单
    return { success: true };
  }

  @Get('user/profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  profile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  @Post('user/phone')
  @ApiOperation({ summary: '用户授权获取手机号' })
  bindUserPhone(@CurrentUser() user: any, @Body() body: { code: string }) {
    return this.authService.bindUserPhone(user.sub, body.code);
  }

  @Get('admin/profile')
  @ApiOperation({ summary: '获取当前管理员信息' })
  adminProfile(@CurrentUser() user: any) {
    return user;
  }
}

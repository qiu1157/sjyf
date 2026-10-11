import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY, ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    // 未携带 token：401 未认证，前端拦截器会跳登录页
    if (!token) throw new UnauthorizedException('未登录');

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
    } catch {
      // token 无效或过期：401 未认证，前端拦截器会跳登录页
      throw new UnauthorizedException('登录已过期');
    }

    // 角色校验：角色不匹配应返回 403 已认证但无权限，避免前端误判为登录过期而登出
    const requiredRoles = this.reflector.getAllAndOverride<number[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(request.user.role)) {
        throw new ForbiddenException('权限不足');
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

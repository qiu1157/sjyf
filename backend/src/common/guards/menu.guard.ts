import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MenuPermissionService } from '../../modules/menu-permission/menu-permission.service';
import { Role } from '../constants/roles.constants';

// 菜单权限守卫：在 @Roles 角色校验通过后，进一步校验当前角色是否拥有接口标注的菜单可见权限
@Injectable()
export class MenuGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private menuService: MenuPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const menuKey = this.reflector.getAllAndOverride<string>('menu', [
      context.getHandler(),
      context.getClass(),
    ]);
    // 未标注 @Menu 的接口不做菜单校验，交由 @Roles 处理
    if (!menuKey) return true;
    const request = context.switchToHttp().getRequest();
    const role = request.user?.role;
    // 系统管理员默认全部可见
    if (role === Role.ADMIN) return true;
    // 无角色信息（未登录或非后台角色）不在此守卫阻断
    if (!role) return true;
    const visibleMenus = await this.menuService.getMenusByRole(role);
    if (!visibleMenus.includes(menuKey)) {
      throw new ForbiddenException('无该菜单访问权限');
    }
    return true;
  }
}

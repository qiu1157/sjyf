import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleMenuPermission } from '../../entities/role-menu-permission.entity';
import { OperationLogHelper, OperatorInfo } from '../../common/utils/operation-log.helper';
import { Role } from '../../common/constants/roles.constants';
import { CONFIGURABLE_MENUS, ADMIN_DEFAULT_MENUS } from '../../common/constants/menu-keys.constants';

@Injectable()
export class MenuPermissionService {
  constructor(
    @InjectRepository(RoleMenuPermission) private repo: Repository<RoleMenuPermission>,
    private logHelper: OperationLogHelper,
  ) {}

  // 获取角色菜单配置（补全所有可配置项，未配置默认不可见）
  async getByRole(role: number) {
    const list = await this.repo.find({ where: { role } });
    return CONFIGURABLE_MENUS.map(m => {
      const item = list.find(l => l.menu_key === m.key);
      return { menu_key: m.key, label: m.label, is_visible: item?.is_visible || 0 };
    });
  }

  // 配置角色菜单权限（删除旧配置重建）
  async config(role: number, menuKeys: string[], operator: OperatorInfo) {
    if (role !== Role.SUPERVISOR) throw new BadRequestException('仅主管角色可配置菜单');
    await this.repo.delete({ role });
    const rows = CONFIGURABLE_MENUS.map(m => this.repo.create({
      role,
      menu_key: m.key,
      is_visible: menuKeys.includes(m.key) ? 1 : 0,
    }));
    await this.repo.save(rows);
    await this.logHelper.write({
      operator,
      module: 'menu_permission',
      action: 'config',
      targetId: role,
      content: '配置主管角色菜单权限',
    });
    return { success: true };
  }

  // 获取角色可见菜单 key 数组（系统管理员返回全部，供守卫与登录态使用）
  async getMenusByRole(role: number): Promise<string[]> {
    if (role === Role.ADMIN) return [...ADMIN_DEFAULT_MENUS];
    const list = await this.repo.find({ where: { role, is_visible: 1 } });
    return list.map(l => l.menu_key);
  }
}

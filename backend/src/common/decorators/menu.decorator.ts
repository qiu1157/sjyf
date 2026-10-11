import { SetMetadata } from '@nestjs/common';

// 菜单权限装饰器：标注接口所属的菜单 key，由 MenuGuard 校验当前角色是否可见
export const Menu = (key: string) => SetMetadata('menu', key);

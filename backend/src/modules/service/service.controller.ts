import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ServiceService } from './service.service';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OperatorInfo } from '../../common/utils/operation-log.helper';

@ApiTags('服务管理')
@Controller()
export class ServiceController {
  constructor(private svc: ServiceService) {}

  // 从 JWT payload 提取操作人信息（sub -> id, role, name）
  private toOperator(user: any): OperatorInfo | undefined {
    if (!user) return undefined;
    return { id: user.sub, role: user.role, name: user.name };
  }

  // ===== 用户端公开接口 =====
  @Public()
  @Get('services/categories')
  publicCategories() { return this.svc.listCategories(true); }

  @Public()
  @Get('services/items')
  publicItems(@Query() q: any) {
    return this.svc.publicListItems(q.categoryId ? +q.categoryId : 0);
  }

  @Public()
  @Get('services/items/:id')
  publicItemDetail(@Param('id') id: number) { return this.svc.publicGetItem(+id); }

  @Public()
  @Get('services/banner')
  publicBanner() { return this.svc.listByZone(1); }

  @Public()
  @Get('services/latest')
  publicLatest() { return this.svc.listByZone(2); }

  @Public()
  @Get('services/hot')
  publicHot() { return this.svc.listByZone(3); }

  // ===== 管理后台接口：品类（内容管理菜单）=====
  @Roles(1, 3)
  @Menu('services')
  @Get('admin/categories')
  adminCategories() { return this.svc.listCategories(); }

  @Roles(1, 3)
  @Menu('services')
  @Post('admin/categories')
  createCategory(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createCategory(body, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Put('admin/categories/:id')
  updateCategory(@Param('id') id: number, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateCategory(+id, body, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Put('admin/categories/:id/status')
  toggleCategory(@Param('id') id: number, @Body() body: { status: number }, @CurrentUser() user: any) {
    return this.svc.toggleCategoryStatus(+id, body.status, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Delete('admin/categories/:id')
  deleteCategory(@Param('id') id: number, @CurrentUser() user: any) {
    return this.svc.deleteCategory(+id, this.toOperator(user));
  }

  // ===== 管理后台接口：服务（内容管理菜单）=====
  @Roles(1, 3)
  @Menu('services')
  @Get('admin/services')
  adminServices(@Query() q: any) { return this.svc.listItems(q); }

  @Roles(1, 3)
  @Menu('services')
  @Get('admin/services/:id')
  adminServiceDetail(@Param('id') id: number) { return this.svc.getItem(+id); }

  @Roles(1, 3)
  @Menu('services')
  @Post('admin/services')
  createService(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createItem(body, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Put('admin/services/:id')
  updateService(@Param('id') id: number, @Body() body: any, @CurrentUser() user: any) {
    return this.svc.updateItem(+id, body, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Put('admin/services/:id/status')
  toggleService(@Param('id') id: number, @Body() body: { status: number }, @CurrentUser() user: any) {
    return this.svc.toggleItemStatus(+id, body.status, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Delete('admin/services/:id')
  deleteService(@Param('id') id: number, @CurrentUser() user: any) {
    return this.svc.deleteItem(+id, this.toOperator(user));
  }

  @Roles(1, 3)
  @Menu('services')
  @Put('admin/services/batch-status')
  batchToggle(@Body() body: { ids: number[]; status: number }) {
    return this.svc.batchToggleStatus(body.ids, body.status);
  }

  // ===== 领队端：可增项服务列表 =====
  @Roles(4)
  @Get('leader/services')
  async leaderSelectable() {
    const result = await this.svc.listItems({ status: 1, pageSize: 999 });
    return result.list.filter((item: any) => item.leader_selectable === 1);
  }
}

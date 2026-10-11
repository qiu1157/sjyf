import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('订单管理')
@Controller()
export class OrderController {
  constructor(private svc: OrderService) {}

  // ===== 用户端 =====
  @Post('orders')
  create(@CurrentUser('sub') userId: number, @Body() body: any) {
    return this.svc.create(userId, body);
  }

  @Get('orders')
  userList(@CurrentUser('sub') userId: number, @Query() q: any) {
    return this.svc.userList(userId, q);
  }

  @Get('orders/:id')
  userDetail(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.svc.userDetail(userId, +id);
  }

  @Post('orders/:id/cancel')
  userCancel(@Param('id') id: number, @CurrentUser('sub') userId: number, @Body() body: { reason: string }) {
    return this.svc.userCancel(userId, +id, body.reason);
  }

  @Get('orders/:id/timeline')
  timeline(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.svc.userTimeline(userId, +id);
  }

  @Get('orders/:id/adjustments')
  userAdjustments(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.svc.listUserAdjustments(userId, +id);
  }

  // ===== 管理后台：订单管理菜单 =====
  @Roles(1, 2, 3)
  @Menu('orders')
  @Get('admin/orders')
  adminList(@Query() q: any) { return this.svc.adminList(q); }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Get('admin/orders/:id')
  adminDetail(@Param('id') id: number) { return this.svc.detail(+id); }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Post('admin/orders/:id/accept')
  accept(@Param('id') id: number, @CurrentUser('sub') uid: number) {
    return this.svc.accept(+id, uid);
  }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Post('admin/orders/:id/plan')
  plan(@Param('id') id: number, @CurrentUser('sub') uid: number, @Body() body: any) {
    return this.svc.plan(+id, body, uid);
  }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Post('admin/orders/:id/reschedule')
  reschedule(@Param('id') id: number, @Body() body: { book_date: string; book_time: string }) {
    return this.svc.reschedule(+id, body.book_date, body.book_time);
  }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Post('admin/orders/:id/cancel')
  adminCancel(@Param('id') id: number, @Body() body: { reason: string }) {
    return this.svc.cancel(+id, body.reason);
  }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Post('admin/orders/:id/cancel/audit')
  cancelAudit(
    @Param('id') id: number,
    @CurrentUser('sub') uid: number,
    @Body() body: { approved: boolean; remark?: string },
  ) {
    return this.svc.cancelAudit(+id, uid, body);
  }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Get('admin/orders/:id/adjustments')
  adminAdjList(@Param('id') id: number) { return this.svc.listAdjustments(+id); }

  @Roles(1, 2, 3)
  @Menu('orders')
  @Get('admin/orders/:id/histories')
  adminHistories(@Param('id') id: number) { return this.svc.listAdminHistories(+id); }

  // ===== 领队端：使用 leaderEmployeeId（JWT payload）而非 sub（user.id）查询订单 =====
  @Roles(4)
  @Get('leader/orders')
  leaderList(@CurrentUser('leaderEmployeeId') leaderEmpId: number, @Query() q: any) {
    return this.svc.leaderList(leaderEmpId, q);
  }

  @Roles(4)
  @Get('leader/orders/:id')
  leaderDetail(@Param('id') id: number, @CurrentUser('leaderEmployeeId') leaderEmpId: number) {
    return this.svc.detail(+id, leaderEmpId);
  }

  @Roles(4)
  @Post('leader/orders/:id/sign-in')
  signIn(@Param('id') id: number, @CurrentUser('leaderEmployeeId') leaderEmpId: number) {
    return this.svc.signIn(+id, leaderEmpId);
  }

  @Roles(4)
  @Post('leader/orders/:id/confirm-staff')
  confirmStaff(
    @Param('id') id: number,
    @CurrentUser('leaderEmployeeId') leaderEmpId: number,
    @Body() body: { employees?: Array<{ employee_id: number; arrived: boolean }>; remark?: string },
  ) {
    return this.svc.confirmStaff(+id, leaderEmpId, body);
  }

  @Roles(4)
  @Post('leader/orders/:id/confirm-materials')
  confirmMaterials(
    @Param('id') id: number,
    @CurrentUser('leaderEmployeeId') leaderEmpId: number,
    @Body() body: { materials?: Array<{ order_material_id: number; checked: boolean }>; remark?: string },
  ) {
    return this.svc.confirmMaterials(+id, leaderEmpId, body);
  }

  @Roles(4)
  @Post('leader/orders/:id/photos')
  uploadPhotos(@Param('id') id: number, @CurrentUser('leaderEmployeeId') leaderEmpId: number, @Body() body: { photos: any[] }) {
    return this.svc.addPhotos(+id, leaderEmpId, body.photos);
  }

  @Roles(4)
  @Get('leader/orders/:id/photos')
  listPhotos(@Param('id') id: number, @CurrentUser('leaderEmployeeId') leaderEmpId: number) {
    return this.svc.listPhotos(+id, leaderEmpId);
  }

  @Roles(4)
  @Delete('leader/orders/:id/photos/:photoId')
  deletePhoto(
    @Param('id') id: number,
    @Param('photoId') photoId: number,
    @CurrentUser('leaderEmployeeId') leaderEmpId: number,
  ) {
    return this.svc.deletePhoto(+id, +photoId, leaderEmpId);
  }

  @Roles(4)
  @Post('leader/orders/:id/adjustments')
  addAdj(@Param('id') id: number, @CurrentUser('leaderEmployeeId') leaderEmpId: number, @Body() body: any) {
    return this.svc.addAdjustment(+id, leaderEmpId, body);
  }

  @Roles(4)
  @Get('leader/orders/:id/adjustments')
  leaderAdjList(@Param('id') id: number) { return this.svc.listAdjustments(+id); }

  @Roles(4)
  @Put('leader/orders/:id/adjustments/:adjId')
  updateAdj(
    @Param('id') id: number,
    @Param('adjId') adjId: number,
    @CurrentUser('leaderEmployeeId') leaderEmpId: number,
    @Body() body: any,
  ) {
    return this.svc.updateAdjustment(+id, +adjId, leaderEmpId, body);
  }

  @Roles(4)
  @Delete('leader/orders/:id/adjustments/:adjId')
  deleteAdj(
    @Param('id') id: number,
    @Param('adjId') adjId: number,
    @CurrentUser('leaderEmployeeId') leaderEmpId: number,
  ) {
    return this.svc.deleteAdjustment(+id, +adjId, leaderEmpId);
  }

  @Post('leader/orders/:id/adjustments/:adjId/confirm')
  confirmAdj(@Param('adjId') adjId: number) {
    return this.svc.confirmAdjustment(+adjId);
  }

  @Roles(4)
  @Post('leader/orders/:id/acceptance')
  acceptance(
    @Param('id') id: number,
    @CurrentUser('leaderEmployeeId') leaderEmpId: number,
    @Body() body: { plan_actual_hours: number; extra_actual_hours: number },
  ) {
    return this.svc.acceptance(+id, leaderEmpId, body);
  }
}

import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('优惠券')
@Controller()
export class CouponController {
  constructor(private svc: CouponService) {}

  // 后台优惠券管理：系统管理员与主管可访问，@Menu 做菜单级鉴权
  @Roles(1, 3)
  @Menu('coupons')
  @Get('admin/coupons')
  adminList() { return this.svc.adminList(); }

  @Roles(1, 3)
  @Menu('coupons')
  @Post('admin/coupons')
  create(@Body() body: any) { return this.svc.createCoupon(body); }

  @Roles(1, 3)
  @Menu('coupons')
  @Put('admin/coupons/:id')
  update(@Param('id') id: number, @Body() body: any) { return this.svc.updateCoupon(+id, body); }

  @Roles(1, 3)
  @Menu('coupons')
  @Put('admin/coupons/:id/status')
  toggle(@Param('id') id: number, @Body() body: { status: number }) {
    return this.svc.toggleCoupon(+id, body.status);
  }

  @Get('coupons/my')
  my(@CurrentUser('sub') uid: number, @Query('status') status: string) {
    return this.svc.myCoupons(uid, status !== undefined ? +status : undefined);
  }

  @Get('coupons/available')
  available(@CurrentUser('sub') uid: number, @Query('amount') amount: string) {
    return this.svc.availableForOrder(uid, +amount || 0);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Coupon } from '../../entities/coupon.entity';
import { UserCoupon } from '../../entities/user-coupon.entity';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon) private ucRepo: Repository<UserCoupon>,
  ) {}

  async adminList() { return this.couponRepo.find({ order: { id: 'DESC' } }); }

  async createCoupon(data: Partial<Coupon>) {
    return this.couponRepo.save(this.couponRepo.create(data));
  }
  async updateCoupon(id: number, data: Partial<Coupon>) {
    await this.couponRepo.update(id, data);
    return this.couponRepo.findOne({ where: { id } });
  }
  async toggleCoupon(id: number, status: number) {
    await this.couponRepo.update(id, { status });
    return { id, status };
  }

  /** 我的优惠券 */
  async myCoupons(userId: number, status?: number) {
    const where: any = { user_id: userId };
    if (status !== undefined) where.status = status;
    const list = await this.ucRepo.find({ where, order: { id: 'DESC' } });
    // 关联 coupon 信息
    const cids = [...new Set(list.map(uc => uc.coupon_id))];
    if (!cids.length) return [];
    const coupons = await this.couponRepo.findByIds(cids);
    const cmap = Object.fromEntries(coupons.map(c => [c.id, c]));
    return list.map(uc => ({ ...uc, coupon: cmap[uc.coupon_id] }));
  }

  /** 订单可用优惠券 */
  async availableForOrder(userId: number, amount: number) {
    const all = await this.myCoupons(userId, 0);
    return all.filter(uc => uc.coupon && uc.coupon.status === 1 && +uc.coupon.min_amount <= amount);
  }
}

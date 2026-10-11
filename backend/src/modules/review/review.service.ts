import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Order } from '../../entities/order.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private repo: Repository<Review>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  async submit(userId: number, dto: { order_id: number; rating: number; content?: string; images?: string[] }) {
    const order = await this.orderRepo.findOne({ where: { id: dto.order_id, user_id: userId } });
    if (!order) throw new BadRequestException('订单不存在');
    throw new BadRequestException('当前版本暂不支持评价功能');
  }

  async getByOrder(orderId: number) {
    const r = await this.repo.findOne({ where: { order_id: orderId } });
    if (r && r.images) (r as any).images = JSON.parse(r.images);
    return r;
  }
}

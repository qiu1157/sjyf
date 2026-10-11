import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderStatus } from '../../common/constants/order-status.constants';

@Injectable()
export class DashboardService {
  constructor(@InjectRepository(Order) private orderRepo: Repository<Order>) {}

  async summary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const all = await this.orderRepo.find();
    const today = all.filter(o => o.created_at >= startOfDay);

    const todayOrders = today.length;
    const todayRevenue = today.reduce((s, o) => s + (+o.first_payment || 0) + (+o.final_payment || 0), 0);
    const pendingAcceptance = all.filter((o) => o.status === OrderStatus.PENDING_FINAL).length;
    const completed = all.filter((o) => o.status === OrderStatus.COMPLETED).length;
    const totalNotCancel = all.filter((o) => o.status !== OrderStatus.CANCELLED).length;
    const completionRate = totalNotCancel ? Math.round((completed / totalNotCancel) * 100) : 0;

    return { todayOrders, todayRevenue, pendingAcceptance, completionRate };
  }

  async orderTrend(days = 7) {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(today.getTime() - i * 86400000);
      const end = new Date(start.getTime() + 86400000);
      const count = await this.orderRepo.count({ where: { created_at: Between(start, end) } });
      data.push({ date: `${start.getMonth() + 1}/${start.getDate()}`, count });
    }
    return data;
  }

  async todoList() {
    const pendingAccept = await this.orderRepo.find({
      where: { status: OrderStatus.PENDING_ACCEPT },
      take: 5,
      order: { id: 'DESC' },
    });
    const pendingAcceptance = await this.orderRepo.find({
      where: { status: OrderStatus.PENDING_FINAL },
      take: 5,
      order: { id: 'DESC' },
    });
    return {
      pendingAccept: pendingAccept.map(o => ({ id: o.id, order_no: o.order_no, service: o.service_name, time: o.book_date })),
      pendingAcceptance: pendingAcceptance.map(o => ({ id: o.id, order_no: o.order_no, service: o.service_name })),
    };
  }

  async hoursAnalysis() {
    const list = await this.orderRepo.find({
      where: { status: OrderStatus.COMPLETED },
      take: 50,
      order: { id: 'DESC' },
    });
    return list.map(o => ({
      id: o.id, order_no: o.order_no, plan: +o.plan_hours, actual: +o.actual_hours,
      diff: (+o.actual_hours - +o.plan_hours).toFixed(1),
    }));
  }

  async financeOverview(startDate?: string, endDate?: string) {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (startDate) qb.andWhere('o.created_at >= :sd', { sd: startDate });
    if (endDate) qb.andWhere('o.created_at <= :ed', { ed: endDate });
    const list = await qb.getMany();
    const firstSum = list.reduce((s, o) => s + (o.first_pay_time ? +o.first_payment : 0), 0);
    const finalSum = list.reduce((s, o) => s + (o.final_pay_time ? +o.final_payment : 0), 0);
    const cancelled = list.filter((o) => o.status === OrderStatus.CANCELLED).length;
    return {
      orderCount: list.length,
      firstPaySum: +firstSum.toFixed(2),
      finalPaySum: +finalSum.toFixed(2),
      totalRevenue: +(firstSum + finalSum).toFixed(2),
      refundCount: cancelled,
    };
  }

  async financeOrders(q: any) {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (q.start_date) qb.andWhere('o.created_at >= :sd', { sd: q.start_date });
    if (q.end_date) qb.andWhere('o.created_at <= :ed', { ed: q.end_date });
    qb.orderBy('o.id', 'DESC');
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }
}

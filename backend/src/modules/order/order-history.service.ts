import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderHistory } from '../../entities/order-history.entity';

/**
 * 订单历史记录服务
 * 负责写入改期与状态变更日志，并提供按订单查询历史的能力
 */
@Injectable()
export class OrderHistoryService {
  constructor(
    @InjectRepository(OrderHistory) private historyRepo: Repository<OrderHistory>,
  ) {}

  /**
   * 记录一条订单历史
   * @param orderId 订单ID
   * @param historyType 1状态变更 2改期
   * @param fromValue 原值（状态码或原日期）
   * @param toValue 新值（状态码或新日期）
   * @param operatorId 操作人ID
   * @param operatorRole 操作人角色（0用户 1-5员工角色）
   * @param operatorName 操作人姓名快照
   * @param remark 备注
   */
  async record(
    orderId: number,
    historyType: number,
    fromValue: string | null,
    toValue: string | null,
    operatorId: number | null,
    operatorRole: number | null,
    operatorName: string | null,
    remark?: string,
  ): Promise<OrderHistory> {
    return this.historyRepo.save(
      this.historyRepo.create({
        order_id: orderId,
        history_type: historyType,
        from_value: fromValue,
        to_value: toValue,
        operator_id: operatorId,
        operator_role: operatorRole,
        operator_name: operatorName,
        remark,
      }),
    );
  }

  /**
   * 查询订单历史列表（按创建时间倒序）
   */
  async listByOrder(orderId: number): Promise<OrderHistory[]> {
    return this.historyRepo.find({
      where: { order_id: orderId },
      order: { created_at: 'DESC' },
    });
  }
}

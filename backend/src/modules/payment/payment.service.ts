import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createSign, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { Order } from '../../entities/order.entity';
import { OrderStatus } from '../../common/constants/order-status.constants';
import { OrderHistoryService } from '../order/order-history.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private orderHistoryService?: OrderHistoryService,
  ) {}

  /** 当前支付模式 */
  get payMode() {
    return process.env.PAY_MODE || 'mock';
  }

  private buildRefundNo(orderNo: string) {
    return `RF${String(orderNo || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 24)}${Date.now()}`;
  }

  private toFen(amount: number | string) {
    return Math.round(Number(amount || 0) * 100);
  }

  private getWechatPrivateKey() {
    const inlineKey = String(process.env.WX_MCH_PRIVATE_KEY || '').trim();
    if (inlineKey) {
      return inlineKey.replace(/\\n/g, '\n');
    }

    const keyPath = String(process.env.WX_MCH_PRIVATE_KEY_PATH || '').trim();
    if (keyPath) {
      return readFileSync(keyPath, 'utf8');
    }

    throw new BadRequestException('未配置微信商户私钥');
  }

  private buildWechatAuthorization(method: string, urlPath: string, body: string, nonce: string, timestamp: string) {
    const mchId = String(process.env.WX_MCH_ID || '').trim();
    const serialNo = String(process.env.WX_MCH_SERIAL_NO || '').trim();
    if (!mchId || !serialNo) {
      throw new BadRequestException('未配置微信商户号或证书序列号');
    }

    const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
    const signer = createSign('RSA-SHA256');
    signer.update(message);
    signer.end();
    const signature = signer.sign(this.getWechatPrivateKey(), 'base64');

    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
  }

  async realRefund(order: Order, reason: string) {
    const refundNo = this.buildRefundNo(order.order_no);
    const body = JSON.stringify({
      out_trade_no: order.order_no,
      out_refund_no: refundNo,
      reason,
      amount: {
        refund: this.toFen(order.first_payment),
        total: this.toFen(order.first_payment),
        currency: 'CNY',
      },
      ...(process.env.WX_REFUND_NOTIFY_URL ? { notify_url: process.env.WX_REFUND_NOTIFY_URL } : {}),
    });
    const urlPath = '/v3/refund/domestic/refunds';
    const nonce = randomUUID().replace(/-/g, '');
    const timestamp = String(Math.floor(Date.now() / 1000));
    const authorization = this.buildWechatAuthorization('POST', urlPath, body, nonce, timestamp);
    const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorization,
        'User-Agent': 'shijia-youfang-backend/1.0',
      },
      body,
    });
    const rawText = await response.text();
    if (!response.ok) {
      throw new BadRequestException(`微信退款失败：${rawText || response.statusText}`);
    }

    const payload = rawText ? JSON.parse(rawText) : {};
    return {
      success: true,
      refundMode: 'real',
      refundNo,
      amount: Number(order.first_payment || 0),
      wxRefundId: payload.refund_id,
      status: payload.status,
    };
  }

  async refundFirstPayment(orderId: number, reason: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('订单不存在');
    if (Number(order.first_payment || 0) <= 0) {
      return {
        success: true,
        refundMode: this.payMode === 'mock' ? 'mock' : 'real',
        refundNo: this.buildRefundNo(order.order_no),
        amount: 0,
      };
    }
    if (this.payMode === 'mock') {
      return {
        success: true,
        refundMode: 'mock',
        refundNo: this.buildRefundNo(order.order_no),
        amount: Number(order.first_payment || 0),
        reason,
      };
    }
    return this.realRefund(order, reason);
  }

  /**
   * 模拟支付 - 开发/SIT环境专用
   */
  async mockPay(orderId: number, payType: 'first' | 'final', success = true) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new BadRequestException('订单不存在');

    if (!success) {
      return { success: false, message: '模拟支付失败', payMode: 'mock' };
    }

    if (payType === 'first') {
      if (order.status !== OrderStatus.PENDING_PAY) throw new BadRequestException('订单状态不允许首付');
      order.first_pay_time = new Date();
      order.status = OrderStatus.PENDING_ACCEPT; // 待接单
    } else {
      if (order.status !== OrderStatus.PENDING_FINAL) throw new BadRequestException('订单状态不允许付尾款');
      order.final_pay_time = new Date();
      order.status = OrderStatus.COMPLETED; // 已完成，不再走 70 待评价
      order.complete_time = new Date();
    }
    await this.orderRepo.save(order);
    return { success: true, message: '模拟支付成功', payMode: 'mock', order };
  }

  /**
   * 发起首付款 - 根据环境分发
   */
  async payFirst(orderId: number) {
    if (this.payMode === 'mock') {
      const result = await this.mockPay(orderId, 'first');
      await this.orderHistoryService?.record(
        result.order.id,
        1,
        String(OrderStatus.PENDING_PAY),
        String(OrderStatus.PENDING_ACCEPT),
        result.order.user_id,
        0,
        null,
        `用户支付首付款 ¥${Number(result.order.first_payment || 0)}`,
      );
      return result;
    }
    // sandbox/real 走微信统一下单
    throw new Error('生产支付未集成，请使用 mock 模式');
  }

  private async getUserFinalPayOrderOrThrow(userId: number, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.user_id !== userId) {
      throw new BadRequestException('订单不存在或非本人');
    }
    if (order.status !== OrderStatus.PENDING_FINAL) {
      throw new BadRequestException('订单状态不允许付尾款');
    }
    return order;
  }

  /**
   * 发起尾款支付
   */
  async payFinalByUser(userId: number, orderId: number) {
    const order = await this.getUserFinalPayOrderOrThrow(userId, orderId);
    if (this.payMode === 'mock') {
      const result = await this.mockPay(orderId, 'final');
      await this.orderHistoryService?.record(
        order.id,
        1,
        String(OrderStatus.PENDING_FINAL),
        String(OrderStatus.COMPLETED),
        userId,
        0,
        null,
        `用户支付尾款 ¥${Number(result.order.final_payment || 0)}`,
      );
      return result;
    }
    throw new Error('生产支付未集成，请使用 mock 模式');
  }
}

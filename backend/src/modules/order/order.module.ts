import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderHistoryService } from './order-history.service';
import { PaymentModule } from '../payment/payment.module';
import {
  Order, OrderEmployee, OrderMaterial, OrderPhoto, OrderAdjustment, OrderHistory,
  ServiceItem, UserAddress, Material, Employee, UserCoupon, Coupon,
} from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([
    Order, OrderEmployee, OrderMaterial, OrderPhoto, OrderAdjustment, OrderHistory,
    ServiceItem, UserAddress, Material, Employee, UserCoupon, Coupon,
  ]), forwardRef(() => PaymentModule)],
  controllers: [OrderController],
  providers: [OrderService, OrderHistoryService],
  exports: [OrderService, OrderHistoryService],
})
export class OrderModule {}

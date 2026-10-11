import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 订单状态枚举:
 * 10 待支付 / 20 待接单 / 30 待上门 / 40 服务中
 * 60 待付尾款 / 80 已完成 / 91 待取消 / 90 已取消
 */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn() id: number;

  @Index({ unique: true })
  @Column({ length: 32 }) order_no: string;

  @Column() user_id: number;
  @Column() service_item_id: number;
  @Column({ length: 128 }) service_name: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) service_price: number;

  @Column({ type: 'date', nullable: true }) book_date: string;
  @Column({ length: 16, nullable: true }) book_time: string;
  @Column({ nullable: true }) address_id: number;
  @Column({ type: 'text', nullable: true }) address_snapshot: string;
  @Column({ length: 512, nullable: true }) user_remark: string;

  @Column({ type: 'int', default: 10 }) status: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) first_payment: number;
  @Column({ type: 'datetime', nullable: true }) first_pay_time: Date;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) final_payment: number;
  @Column({ type: 'datetime', nullable: true }) final_pay_time: Date;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) extra_amount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) total_amount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) discount_amount: number;
  @Column({ nullable: true }) coupon_id: number;

  @Column({ nullable: true }) leader_id: number;
  @Column({ nullable: true }) supervisor_id: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 }) plan_hours: number;
  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 }) plan_actual_hours: number;
  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 }) extra_actual_hours: number;
  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 }) actual_hours: number;
  @Column({ type: 'text', nullable: true }) service_plan_detail: string;
  @Column({ type: 'text', nullable: true }) service_plan: string;

  @Column({ type: 'datetime', nullable: true }) sign_in_time: Date;
  @Column({ type: 'datetime', nullable: true }) accept_time: Date;
  @Column({ type: 'datetime', nullable: true }) complete_time: Date;
  @Column({ type: 'datetime', nullable: true }) cancel_time: Date;
  @Column({ length: 512, nullable: true }) cancel_reason: string;

  // 取消审核相关字段（91 待取消中间状态使用）
  @Column({ type: 'int', nullable: true }) prev_status: number;
  @Column({ type: 'datetime', nullable: true }) cancel_apply_time: Date;
  @Column({ type: 'datetime', nullable: true }) cancel_audit_time: Date;
  @Column({ length: 512, nullable: true }) cancel_audit_remark: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) refund_amount: number;
  @Column({ length: 512, nullable: true }) staff_check_remark: string;
  @Column({ length: 512, nullable: true }) material_check_remark: string;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

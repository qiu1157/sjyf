import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// status: 0未使用 1已使用 2已过期
@Entity('user_coupons')
export class UserCoupon {
  @PrimaryGeneratedColumn() id: number;
  @Column() user_id: number;
  @Column() coupon_id: number;
  @Column({ type: 'int', default: 0 }) status: number;
  @Column({ nullable: true }) used_order_id: number;
  @Column({ type: 'datetime', nullable: true }) used_time: Date;
  @Column({ type: 'datetime', nullable: true }) expire_time: Date;
  @CreateDateColumn() created_at: Date;
}

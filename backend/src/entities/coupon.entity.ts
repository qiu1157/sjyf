import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// type: 1满减 2折扣 3无门槛
// grant_type: 1自动赠送 2自主领取 3手动发放
@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 64 }) name: string;
  @Column({ type: 'int', default: 1 }) type: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) value: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) min_amount: number;
  @Column({ type: 'int', default: 30 }) valid_days: number;
  @Column({ type: 'int', default: 0 }) total_quantity: number;
  @Column({ type: 'int', default: 0 }) used_quantity: number;
  @Column({ type: 'int', default: 2 }) grant_type: number;
  @Column({ type: 'int', default: 1 }) status: number;
  @CreateDateColumn() created_at: Date;
}

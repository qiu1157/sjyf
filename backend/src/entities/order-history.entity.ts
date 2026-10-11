import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 订单历史记录表
 * history_type: 1状态变更 2改期
 */
@Entity('order_histories')
export class OrderHistory {
  @PrimaryGeneratedColumn() id: number;

  @Index() @Column() order_id: number;

  @Column({ type: 'int' }) history_type: number;
  @Column({ length: 64, nullable: true }) from_value: string;
  @Column({ length: 64, nullable: true }) to_value: string;
  @Column({ nullable: true }) operator_id: number;
  @Column({ type: 'int', nullable: true }) operator_role: number;
  @Column({ length: 32, nullable: true }) operator_name: string;
  @Column({ length: 512, nullable: true }) remark: string;

  @CreateDateColumn() created_at: Date;
}

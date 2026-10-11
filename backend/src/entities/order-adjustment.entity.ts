import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// adjust_type: 1增项服务 2调价 3增补物料
@Entity('order_adjustments')
export class OrderAdjustment {
  @PrimaryGeneratedColumn() id: number;
  @Column() order_id: number;
  @Column({ type: 'int' }) adjust_type: number;
  @Column({ nullable: true }) service_item_id: number;
  @Column({ length: 128, nullable: true }) service_name: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) adjust_amount: number;
  @Column({ nullable: true }) material_id: number;
  @Column({ length: 64, nullable: true }) material_name: string;
  @Column({ type: 'int', default: 0 }) material_quantity: number;
  @Column({ length: 512, nullable: true }) remark: string;
  @Column({ type: 'int', default: 0 }) user_confirmed: number;
  @Column({ nullable: true }) operator_id: number;
  @Column({ length: 32, nullable: true }) operator_name: string;
  @Column({ type: 'int', default: 0 }) is_deleted: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

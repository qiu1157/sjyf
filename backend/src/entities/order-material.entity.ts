import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('order_materials')
export class OrderMaterial {
  @PrimaryGeneratedColumn() id: number;
  @Column() order_id: number;
  @Column({ nullable: true }) adjustment_id: number;
  @Column() material_id: number;
  @Column({ length: 64 }) material_name: string;
  @Column({ type: 'int', default: 1 }) quantity: number;
  @Column({ type: 'int', default: 0 }) is_extra: number;
  @Column({ type: 'int', default: 0 }) checked: number;
  @Column({ type: 'datetime', nullable: true }) checked_at: Date;
  @Column({ nullable: true }) checked_by: number;
  @CreateDateColumn() created_at: Date;
}

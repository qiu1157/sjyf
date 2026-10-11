import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('order_employees')
export class OrderEmployee {
  @PrimaryGeneratedColumn() id: number;
  @Column() order_id: number;
  @Column() employee_id: number;
  @Column({ type: 'int', default: 0 }) is_leader: number;
  @Column({ type: 'decimal', precision: 4, scale: 1, default: 0 }) actual_hours: number;
  @Column({ type: 'datetime', nullable: true }) arrived_at: Date;
  @Column({ nullable: true }) arrived_by: number;
  @CreateDateColumn() created_at: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn() id: number;
  @Column({ nullable: true }) operator_id: number;
  @Column({ type: 'int', nullable: true }) operator_role: number;
  @Column({ length: 32, nullable: true }) operator_name: string;
  @Column({ length: 32, nullable: true }) module: string;
  @Column({ length: 64, nullable: true }) action: string;
  @Column({ nullable: true }) target_id: number;
  @Column({ type: 'text', nullable: true }) content: string;
  @Column({ length: 64, nullable: true }) ip: string;
  @CreateDateColumn() created_at: Date;
}

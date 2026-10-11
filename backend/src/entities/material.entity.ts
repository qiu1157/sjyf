import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 64 }) name: string;
  @Column({ length: 32, nullable: true }) category: string;
  @Column({ length: 128, nullable: true }) specification: string;
  @Column({ length: 16, default: '个' }) unit: string;
  @Column({ type: 'int', default: 1 }) status: number;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

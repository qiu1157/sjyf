import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 64 }) name: string;
  // 图标：存储本地路径，如 /uploads/categories/xxx.png
  @Column({ length: 256, nullable: true }) icon: string;
  @Column({ type: 'int', default: 0 }) sort: number;
  @Column({ length: 256, nullable: true }) description: string;
  @Column({ type: 'int', default: 1 }) status: number;
  @Column({ type: 'int', default: 1 }) show_user: number;
  @Column({ type: 'int', default: 1 }) show_leader: number;
  // 软删除：0 未删除，1 已删除
  @Column({ type: 'int', default: 0 }) is_deleted: number;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

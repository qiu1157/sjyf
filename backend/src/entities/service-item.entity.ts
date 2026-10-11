import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_items')
export class ServiceItem {
  @PrimaryGeneratedColumn() id: number;
  @Column() category_id: number;
  @Column({ length: 128 }) name: string;
  // 原图路径，如 /uploads/services/xxx.jpg
  @Column({ length: 256, nullable: true }) cover_image: string;
  // 缩略图路径（sharp 生成，同目录 _thumb 后缀）
  @Column({ length: 256, nullable: true }) thumbnail_image: string;
  // 走马灯大图路径（display_zone=1 时有值）
  @Column({ length: 256, nullable: true }) banner_image: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) price: number;
  // 促销价（可空，须 >0 且 < price）
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) promo_price: number;
  @Column({ type: 'int', default: 60 }) duration: number;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'text', nullable: true }) content: string;
  @Column({ length: 512, nullable: true }) scope: string;
  @Column({ length: 512, nullable: true }) notice: string;
  @Column({ type: 'int', default: 0 }) sort: number;
  @Column({ type: 'int', default: 1 }) status: number;
  @Column({ type: 'int', default: 1 }) show_user: number;
  @Column({ type: 'int', default: 1 }) leader_selectable: number;
  // 展示专区：0 无 / 1 走马灯 / 2 最新活动 / 3 热销
  @Column({ type: 'int', default: 0 }) display_zone: number;
  // 软删除：0 未删除，1 已删除
  @Column({ type: 'int', default: 0 }) is_deleted: number;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

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
  // 详情 HTML 快照（服务端由 content_blocks 生成，小程序渲染用；历史纯文本值保留）
  @Column({ type: 'text', nullable: true }) content: string;
  // 块式详情结构化数据（JSON 字符串），形如 {"version":1,"blocks":[...]}
  @Column({ type: 'text', nullable: true }) content_blocks: string;
  @Column({ length: 512, nullable: true }) scope: string;
  @Column({ length: 512, nullable: true }) notice: string;
  // 服务方式：1 上门服务 / 2 到店服务 / 3 上门或到店均可（空=未填写）
  @Column({ type: 'int', nullable: true }) service_mode: number;
  // 服务人数上限（人），空=不限
  @Column({ type: 'int', nullable: true }) people_count: number;
  // 适用面积上限（㎡），空=不限
  @Column({ type: 'int', nullable: true }) area_max: number;
  // 计价方式：1 按次一口价 / 2 按小时计费 / 3 按平方米计费 / 4 按人天计费 / 5 面议（空=面议）
  @Column({ type: 'int', nullable: true }) price_unit: number;
  // 服务期限（下单后 N 天内有效），空=长期有效
  @Column({ type: 'int', nullable: true }) validity_days: number;
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

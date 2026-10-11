import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// photo_type: 1服务前 2服务后
@Entity('order_photos')
export class OrderPhoto {
  @PrimaryGeneratedColumn() id: number;
  @Column() order_id: number;
  @Column({ type: 'int' }) photo_type: number;
  @Column({ length: 32, nullable: true }) space_name: string;
  @Column({ length: 256 }) photo_url: string;
  @Column({ type: 'int', default: 0 }) sort: number;
  @Column({ nullable: true }) uploaded_by: number;
  @CreateDateColumn() created_at: Date;
}

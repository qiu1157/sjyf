import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) order_id: number;
  @Column() user_id: number;
  @Column({ type: 'int' }) rating: number;
  @Column({ type: 'text', nullable: true }) content: string;
  @Column({ type: 'text', nullable: true }) images: string;
  @Column({ type: 'text', nullable: true }) merchant_reply: string;
  @Column({ type: 'datetime', nullable: true }) reply_time: Date;
  @CreateDateColumn() created_at: Date;
}

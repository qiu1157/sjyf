import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn() id: number;
  @Column() user_id: number;
  @Column({ length: 32 }) contact_name: string;
  @Column({ length: 20 }) contact_phone: string;
  @Column({ length: 32, nullable: true }) province: string;
  @Column({ length: 32, nullable: true }) city: string;
  @Column({ length: 32, nullable: true }) district: string;
  @Column({ length: 256 }) detail: string;
  @Column({ type: 'int', default: 0 }) is_default: number;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

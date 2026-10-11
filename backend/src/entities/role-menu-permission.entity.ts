import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('role_menu_permissions')
@Index(['role', 'menu_key'], { unique: true })
export class RoleMenuPermission {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int' }) role: number;
  @Column({ length: 64 }) menu_key: string;
  @Column({ type: 'int', default: 0 }) is_visible: number;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

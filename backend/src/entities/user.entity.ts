import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;

  @Index({ unique: true })
  @Column({ length: 64, nullable: true }) openid: string;

  @Column({ length: 64, nullable: true }) unionid: string;
  @Column({ length: 64, nullable: true }) nickname: string;
  @Column({ length: 256, nullable: true }) avatar: string;

  @Index({ unique: true })
  @Column({ length: 20, nullable: true }) phone: string;

  @Column({ type: 'int', default: 0 }) gender: number;
  @Column({ type: 'int', default: 0 }) status: number;
  // 最近小程序登录时间
  @Column({ type: 'datetime', nullable: true }) last_login_time: Date;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

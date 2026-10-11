import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

// 角色: 1系统管理员 2店长(预留) 3主管 4领队 5服务人员(预留)
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 32 }) name: string;

  @Index({ unique: true })
  @Column({ length: 20, nullable: true }) phone: string;

  @Index({ unique: true })
  @Column({ length: 64, nullable: true }) openid: string;
  @Column({ length: 256, nullable: true }) avatar: string;
  @Column({ type: 'int', default: 5 }) role: number;
  @Column({ type: 'int', default: 1 }) status: number;
  @Column({ length: 128, nullable: true }) password: string;
  @Column({ length: 64, nullable: true }) username: string;
  // 领队备注（技能专长、所属区域等）
  @Column({ length: 512, nullable: true }) remark: string;
  // 领队是否有效：0否 1是，取消领队身份置 0 保留档案
  @Column({ type: 'int', default: 0 }) is_leader_active: number;
  // 最近后台登录时间
  @Column({ type: 'datetime', nullable: true }) last_login_time: Date;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}

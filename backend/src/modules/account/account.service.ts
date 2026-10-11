import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Employee } from '../../entities/employee.entity';
import { OperationLogHelper, OperatorInfo } from '../../common/utils/operation-log.helper';
import { Role } from '../../common/constants/roles.constants';

// 后台账号创建入参
export interface CreateAccountDto {
  username: string;
  password: string;
  name: string;
  phone: string;
  role: number;
}

// 编辑账号入参（username 不可改）
export interface UpdateAccountDto {
  name: string;
  phone: string;
}

// 重置密码入参
export interface ResetPasswordDto {
  newPassword: string;
}

// 修改自己密码入参
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

// 后台账号列表查询入参
export interface AccountQueryDto {
  keyword?: string;
  role?: number;
  status?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Employee) private repo: Repository<Employee>,
    private logHelper: OperationLogHelper,
  ) {}

  // 账号列表：仅返回后台账号（role in 1/3），支持关键字/角色/状态筛选 + 分页
  async list(q: AccountQueryDto) {
    const qb = this.repo.createQueryBuilder('e');
    qb.where('e.role IN (:...roles)', { roles: [Role.ADMIN, Role.SUPERVISOR] });
    if (q.keyword) {
      qb.andWhere('(e.username LIKE :kw OR e.name LIKE :kw OR e.phone LIKE :kw)', { kw: `%${q.keyword}%` });
    }
    if (q.role) qb.andWhere('e.role = :r', { r: +q.role });
    if (q.status !== undefined) qb.andWhere('e.status = :s', { s: +q.status });
    qb.orderBy('e.id', 'DESC');
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    list.forEach((it) => delete (it as any).password);
    return { list, total, page, pageSize };
  }

  // 新增后台账号：校验账号/手机号唯一、角色限定 1/3，bcrypt 加密密码
  async create(dto: CreateAccountDto, operator: OperatorInfo) {
    const existsAccount = await this.repo.findOne({ where: { username: dto.username } });
    if (existsAccount) throw new BadRequestException('账号已存在');
    const existsPhone = await this.repo.findOne({ where: { phone: dto.phone } });
    if (existsPhone) throw new BadRequestException('手机号已被使用');
    if (!([Role.ADMIN, Role.SUPERVISOR] as number[]).includes(dto.role)) {
      throw new BadRequestException('角色无效，仅支持系统管理员或主管');
    }
    const emp = this.repo.create({
      username: dto.username,
      password: await bcrypt.hash(dto.password, 10),
      name: dto.name,
      phone: dto.phone,
      role: dto.role,
      status: 1,
    });
    const saved = await this.repo.save(emp);
    delete saved.password;
    await this.logHelper.write({
      operator,
      module: 'account',
      action: 'create',
      targetId: saved.id,
      content: `新增账号 ${dto.username}`,
    });
    return saved;
  }

  // 账号详情
  async detail(id: number) {
    const emp = await this.repo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('账号不存在');
    delete emp.password;
    return emp;
  }

  // 编辑账号信息：仅可改姓名、手机号（username 不可改）；手机号唯一性校验排除自身；主管仅可编辑自己
  async update(id: number, dto: UpdateAccountDto, operator: OperatorInfo) {
    const emp = await this.repo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('账号不存在');
    // 主管仅可编辑自己
    if (operator.role === Role.SUPERVISOR && operator.id !== id) {
      throw new ForbiddenException('主管仅可编辑自己的账号信息');
    }
    // 手机号唯一性校验（排除自身）
    if (dto.phone && dto.phone !== emp.phone) {
      const existsPhone = await this.repo.findOne({ where: { phone: dto.phone } });
      if (existsPhone && existsPhone.id !== id) {
        throw new BadRequestException('手机号已被其他账号使用');
      }
    }
    await this.repo.update(id, { name: dto.name, phone: dto.phone });
    await this.logHelper.write({
      operator,
      module: 'account',
      action: 'update',
      targetId: id,
      content: `编辑账号 ${emp.username} 的信息`,
    });
    const updated = await this.repo.findOne({ where: { id } });
    if (updated) delete updated.password;
    return updated;
  }

  // 启停账号：切换 status；admin 账号禁用需二次确认（后端校验提示）
  async toggle(id: number, operator: OperatorInfo) {
    const emp = await this.repo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('账号不存在');
    // 不允许禁用自己
    if (operator.id === id) {
      throw new BadRequestException('不允许禁用自己的账号');
    }
    const newStatus = emp.status === 1 ? 0 : 1;
    await this.repo.update(id, { status: newStatus });
    await this.logHelper.write({
      operator,
      module: 'account',
      action: 'toggle',
      targetId: id,
      content: `${newStatus === 1 ? '启用' : '禁用'}账号 ${emp.username}`,
    });
    return { id, status: newStatus };
  }

  // 重置其他账号密码：bcrypt 加密新密码，不记录明文
  async resetPassword(id: number, dto: ResetPasswordDto, operator: OperatorInfo) {
    const emp = await this.repo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('账号不存在');
    await this.repo.update(id, { password: await bcrypt.hash(dto.newPassword, 10) });
    await this.logHelper.write({
      operator,
      module: 'account',
      action: 'reset_password',
      targetId: id,
      content: `重置账号 ${emp.username} 的密码`,
    });
    return { id, success: true };
  }

  // 修改自己的密码：校验原密码，bcrypt 加密新密码
  async changePassword(userId: number, dto: ChangePasswordDto, operator: OperatorInfo) {
    const emp = await this.repo.findOne({ where: { id: userId } });
    if (!emp) throw new NotFoundException('账号不存在');
    // 校验原密码
    if (!emp.password || !(await bcrypt.compare(dto.oldPassword, emp.password))) {
      throw new BadRequestException('原密码不正确');
    }
    // 新密码不能与原密码相同
    if (await bcrypt.compare(dto.newPassword, emp.password)) {
      throw new BadRequestException('新密码不能与原密码相同');
    }
    await this.repo.update(userId, { password: await bcrypt.hash(dto.newPassword, 10) });
    await this.logHelper.write({
      operator,
      module: 'account',
      action: 'change_password',
      targetId: userId,
      content: `修改自己的密码`,
    });
    return { id: userId, success: true };
  }
}

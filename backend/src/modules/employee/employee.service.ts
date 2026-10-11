import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { Role } from '../../common/constants/roles.constants';

// 人员管理仅维护领队与服务人员两种角色（后台账号由 account 模块单独维护）
const ALLOWED_ROLES: number[] = [Role.LEADER, Role.STAFF];

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee) private repo: Repository<Employee>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  async list(q: { keyword?: string; role?: number; status?: number; page?: number; pageSize?: number }) {
    const qb = this.repo.createQueryBuilder('e');
    if (q.keyword) qb.andWhere('(e.name LIKE :kw OR e.phone LIKE :kw)', { kw: `%${q.keyword}%` });
    // 角色筛选：领队仅展示有效领队，服务人员展示全部服务人员
    if (q.role !== undefined && q.role !== null && !Number.isNaN(+q.role)) {
      const r = +q.role;
      if (!ALLOWED_ROLES.includes(r)) throw new BadRequestException('仅支持查询领队或服务人员');
      if (r === Role.LEADER) {
        qb.andWhere('e.role = :leaderRole AND e.is_leader_active = :leaderActive', {
          leaderRole: Role.LEADER,
          leaderActive: 1,
        });
      } else {
        qb.andWhere('e.role = :staffRole', { staffRole: Role.STAFF });
      }
    } else {
      qb.andWhere('((e.role = :leaderRole AND e.is_leader_active = :leaderActive) OR e.role = :staffRole)', {
        leaderRole: Role.LEADER,
        leaderActive: 1,
        staffRole: Role.STAFF,
      });
    }
    if (q.status !== undefined) qb.andWhere('e.status = :s', { s: q.status });
    qb.orderBy('e.id', 'DESC');
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    if (list.length === 0) {
      return { list: [], total, page, pageSize };
    }

    const openids = list.map((item) => item.openid).filter((item) => !!item);
    const users = openids.length > 0
      ? await this.userRepo.createQueryBuilder('u')
        .where('u.openid IN (:...openids)', { openids })
        .getMany()
      : [];
    const userMap = new Map(users.map((item) => [item.openid, item]));

    const leaderIds = list
      .filter((item) => item.role === Role.LEADER)
      .map((item) => item.id);
    const orderCounts = leaderIds.length > 0
      ? await this.orderRepo.createQueryBuilder('o')
        .select('o.leader_id', 'leader_id')
        .addSelect('COUNT(1)', 'count')
        .where('o.leader_id IN (:...leaderIds)', { leaderIds })
        .groupBy('o.leader_id')
        .getRawMany()
      : [];
    const orderCountMap = new Map(orderCounts.map((item) => [+item.leader_id, +item.count]));

    return {
      list: list.map((item) => {
        const user = item.openid ? userMap.get(item.openid) : null;
        return {
          id: item.id,
          user_id: user?.id || null,
          name: item.name,
          phone: item.phone,
          role: item.role,
          status: item.status,
          is_leader_active: item.is_leader_active,
          remark: item.remark,
          wx_nickname: user?.nickname || null,
          wx_avatar: user?.avatar || null,
          order_count: item.role === Role.LEADER ? (orderCountMap.get(item.id) || 0) : 0,
          created_at: item.created_at,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async create(data: Partial<Employee>) {
    if (data.role !== undefined && +data.role !== Role.STAFF) {
      throw new BadRequestException('人员管理仅支持新增服务人员');
    }
    if (data.phone) {
      const existsPhone = await this.repo.findOne({ where: { phone: data.phone } });
      if (existsPhone) throw new BadRequestException('手机号已被其他员工使用');
    }
    data.role = Role.STAFF;
    if (data.password) data.password = await bcrypt.hash(data.password, 10);
    const emp = await this.repo.save(this.repo.create(data));
    delete emp.password;
    return emp;
  }

  async update(id: number, data: Partial<Employee>) {
    const current = await this.repo.findOne({ where: { id } });
    if (!current) throw new BadRequestException('员工不存在');

    if (data.phone && data.phone !== current.phone) {
      const existsPhone = await this.repo.findOne({ where: { phone: data.phone } });
      if (existsPhone && existsPhone.id !== id) {
        throw new BadRequestException('手机号已被其他员工使用');
      }
    }

    delete data.role;
    delete data.openid;
    delete data.username;
    delete data.password;
    await this.repo.update(id, data);
    const emp = await this.repo.findOne({ where: { id } });
    if (emp) delete emp.password;
    return emp;
  }

  async toggle(id: number, status: number) {
    await this.repo.update(id, { status });
    return { id, status };
  }
}

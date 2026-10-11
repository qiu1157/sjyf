import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { OperationLogHelper, OperatorInfo } from '../../common/utils/operation-log.helper';
import { Role } from '../../common/constants/roles.constants';

export interface LeaderQueryDto {
  keyword?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}

export interface UpdateLeaderDto {
  name: string;
  phone: string;
  remark?: string;
}

@Injectable()
export class LeaderAdminService {
  constructor(
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private logHelper: OperationLogHelper,
  ) {}

  async list(q: LeaderQueryDto) {
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    const qb = this.empRepo.createQueryBuilder('e');
    qb.where('e.role = :role', { role: Role.LEADER })
      .andWhere('e.is_leader_active = :active', { active: 1 });

    if (q.keyword) {
      qb.andWhere('(e.name LIKE :kw OR e.phone LIKE :kw)', { kw: `%${q.keyword}%` });
    }
    if (q.status !== undefined && q.status !== null && !Number.isNaN(+q.status)) {
      qb.andWhere('e.status = :status', { status: +q.status });
    }

    qb.orderBy('e.id', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [leaders, total] = await qb.getManyAndCount();
    if (leaders.length === 0) {
      return { list: [], total, page, pageSize };
    }

    const openids = leaders.map((item) => item.openid).filter((item) => !!item);
    const users = openids.length > 0
      ? await this.userRepo.createQueryBuilder('u')
        .where('u.openid IN (:...openids)', { openids })
        .getMany()
      : [];
    const userMap = new Map(users.map((item) => [item.openid, item]));

    const leaderIds = leaders.map((item) => item.id);
    const orderCounts = await this.orderRepo.createQueryBuilder('o')
      .select('o.leader_id', 'leader_id')
      .addSelect('COUNT(1)', 'count')
      .where('o.leader_id IN (:...leaderIds)', { leaderIds })
      .groupBy('o.leader_id')
      .getRawMany();
    const orderCountMap = new Map(orderCounts.map((item) => [+item.leader_id, +item.count]));

    return {
      list: leaders.map((item) => {
        const user = item.openid ? userMap.get(item.openid) : null;
        return {
          id: item.id,
          user_id: user?.id || null,
          name: item.name,
          phone: item.phone,
          wx_nickname: user?.nickname || null,
          wx_avatar: user?.avatar || null,
          status: item.status,
          remark: item.remark,
          is_leader_active: item.is_leader_active,
          order_count: orderCountMap.get(item.id) || 0,
          created_at: item.created_at,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  async detail(id: number) {
    const leader = await this.empRepo.findOne({
      where: { id, role: Role.LEADER, is_leader_active: 1 },
    });
    if (!leader) throw new NotFoundException('领队不存在');

    const user = leader.openid
      ? await this.userRepo.findOne({ where: { openid: leader.openid } })
      : null;
    const order_count = await this.orderRepo.count({ where: { leader_id: id } });

    return {
      id: leader.id,
      user_id: user?.id || null,
      name: leader.name,
      phone: leader.phone,
      wx_nickname: user?.nickname || null,
      wx_avatar: user?.avatar || null,
      status: leader.status,
      remark: leader.remark,
      is_leader_active: leader.is_leader_active,
      order_count,
      created_at: leader.created_at,
    };
  }

  async update(id: number, dto: UpdateLeaderDto, operator: OperatorInfo) {
    const leader = await this.empRepo.findOne({
      where: { id, role: Role.LEADER, is_leader_active: 1 },
    });
    if (!leader) throw new NotFoundException('领队不存在');

    if (dto.phone && dto.phone !== leader.phone) {
      const existsPhone = await this.empRepo.findOne({ where: { phone: dto.phone } });
      if (existsPhone && existsPhone.id !== id) {
        throw new BadRequestException('手机号已被其他员工使用');
      }
    }

    await this.empRepo.update(id, {
      name: dto.name,
      phone: dto.phone,
      remark: dto.remark || null,
    });

    await this.logHelper.write({
      operator,
      module: 'employee',
      action: 'update',
      targetId: id,
      content: `编辑领队 ${leader.name} 的档案信息`,
    });

    return this.detail(id);
  }

  async toggle(id: number, operator: OperatorInfo) {
    const leader = await this.empRepo.findOne({
      where: { id, role: Role.LEADER, is_leader_active: 1 },
    });
    if (!leader) throw new NotFoundException('领队不存在');

    const status = leader.status === 1 ? 0 : 1;
    await this.empRepo.update(id, { status });

    await this.logHelper.write({
      operator,
      module: 'employee',
      action: 'toggle_status',
      targetId: id,
      content: `${status === 1 ? '启用' : '禁用'}领队 ${leader.name}`,
    });

    return { id, status };
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Employee } from '../../entities/employee.entity';
import { Order } from '../../entities/order.entity';
import { UserAddress } from '../../entities/user-address.entity';
import { OperationLogHelper, OperatorInfo } from '../../common/utils/operation-log.helper';
import { Role } from '../../common/constants/roles.constants';
import { OrderStatus } from '../../common/constants/order-status.constants';

// 微信用户列表查询入参
export interface WxUserQueryDto {
  role?: number;       // 0全部 1普通用户 2领队
  keyword?: string;    // 昵称/手机号模糊搜索
  page?: number;
  pageSize?: number;
}

// 设置为领队入参
export interface SetLeaderDto {
  name: string;
  phone: string;
  status?: number;
  remark?: string;
}

@Injectable()
export class UserAdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(UserAddress) private addressRepo: Repository<UserAddress>,
    private logHelper: OperationLogHelper,
  ) {}

  private formatAddress(item: UserAddress) {
    return {
      id: item.id,
      contact_name: item.contact_name,
      contact_phone: item.contact_phone,
      province: item.province,
      city: item.city,
      district: item.district,
      detail: item.detail,
      is_default: item.is_default,
      full_address: `${item.province || ''}${item.city || ''}${item.district || ''}${item.detail || ''}`.trim(),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  // 微信用户列表：支持 role 标记筛选（全部/普通用户/领队）+ 昵称/手机号模糊搜索 + 分页
  // is_leader 标记：关联 employees 表 role=4 status=1 is_leader_active=1 判断
  // 实现方式：先查 user 分页，再批量查领队 employee 映射，内存补全（避免子查询/leftJoin 在 sqljs 的兼容问题）
  async list(q: WxUserQueryDto) {
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    // query 参数为字符串，转为数字便于比较（0/undefined=全部，1=普通用户，2=领队）
    const roleFilter = q.role !== undefined ? +q.role : 0;

    // 第一步：查 user 列表（仅按 keyword 筛选，分页）
    const userQb = this.userRepo.createQueryBuilder('u');
    if (q.keyword) {
      userQb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw)', { kw: `%${q.keyword}%` });
    }
    userQb.orderBy('u.id', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [users, total] = await userQb.getManyAndCount();

    // 第二步：批量查这些 user 的 openid 对应的有效领队 employee
    const openids = users.map((u) => u.openid).filter((o) => o && o.trim() !== '');
    let leaderMap = new Map<string, { id: number; name: string }>();
    if (openids.length > 0) {
      const leaders = await this.empRepo.find({
        where: { role: Role.LEADER, status: 1, is_leader_active: 1 },
      });
      // 内存过滤 openid 在当前页 user 列表中的领队
      const openidSet = new Set(openids);
      leaderMap = new Map(
        leaders.filter((l) => l.openid && openidSet.has(l.openid))
          .map((l) => [l.openid, { id: l.id, name: l.name }]),
      );
    }

    // 第三步：内存补全 is_leader 标记，并按 role 筛选
    let list = users.map((u) => {
      const leader = u.openid ? leaderMap.get(u.openid) : null;
      return {
        id: u.id,
        avatar: u.avatar,
        nickname: u.nickname,
        phone: u.phone,
        openid: u.openid,
        gender: u.gender,
        created_at: u.created_at,
        last_login_time: u.last_login_time,
        is_leader: leader ? 1 : 0,
        leader_employee_id: leader?.id || null,
        leader_name: leader?.name || null,
      };
    });

    // 第四步：按 role 筛选（全部/普通用户/领队），分页已在前置完成
    if (roleFilter === 1) {
      list = list.filter((it) => it.is_leader === 0);
    } else if (roleFilter === 2) {
      list = list.filter((it) => it.is_leader === 1);
    }

    // 注：按 role 筛选时 total 需重新计算（因分页在前），此处简化：查全部领队 employee 内存匹配
    let finalTotal = total;
    if (roleFilter === 1 || roleFilter === 2) {
      // 查全部有效领队 employee（不用 IN，避免参数绑定问题）
      const allLeaders = await this.empRepo.find({
        where: { role: Role.LEADER, status: 1, is_leader_active: 1 },
      });
      const allLeaderOpenids = new Set(allLeaders.map((l) => l.openid).filter((o) => o && o.trim() !== ''));
      // 查全部 user（不分页）
      const allUsersQb = this.userRepo.createQueryBuilder('u');
      if (q.keyword) {
        allUsersQb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw)', { kw: `%${q.keyword}%` });
      }
      const allUsers = await allUsersQb.getMany();
      finalTotal = allUsers.filter((u) => {
        const isLeader = u.openid ? (allLeaderOpenids.has(u.openid) ? 1 : 0) : 0;
        return roleFilter === 1 ? isLeader === 0 : isLeader === 1;
      }).length;
    }

    return { list, total: finalTotal, page, pageSize };
  }

  async detail(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const orders = await this.orderRepo.createQueryBuilder('o')
      .where('o.user_id = :userId', { userId })
      .orderBy('o.id', 'DESC')
      .getMany();

    const addresses = await this.addressRepo.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', updated_at: 'DESC', id: 'DESC' },
    });

    const leader = user.openid
      ? await this.empRepo.createQueryBuilder('e')
        .where('e.role = :role', { role: Role.LEADER })
        .andWhere('e.openid = :openid', { openid: user.openid })
        .orderBy('e.id', 'DESC')
        .getOne()
      : null;

    const leaderProfile = leader
      ? {
        id: leader.id,
        name: leader.name,
        phone: leader.phone,
        status: leader.status,
        remark: leader.remark,
        is_leader_active: leader.is_leader_active,
        order_count: await this.orderRepo.count({ where: { leader_id: leader.id } }),
      }
      : null;

    return {
      user: {
        id: user.id,
        avatar: user.avatar,
        nickname: user.nickname,
        phone: user.phone,
        gender: user.gender,
        created_at: user.created_at,
        last_login_time: user.last_login_time,
      },
      orders: orders.map((item) => ({
        id: item.id,
        order_no: item.order_no,
        service_name: item.service_name,
        status: item.status,
        total_amount: item.total_amount,
        book_date: item.book_date,
        book_time: item.book_time,
        created_at: item.created_at,
      })),
      addresses: addresses.map((item) => this.formatAddress(item)),
      leaderProfile,
    };
  }

  // 将普通用户设置为领队：校验用户存在、有 openid、未已是领队、手机号唯一
  async setLeader(userId: number, dto: SetLeaderDto, operator: OperatorInfo) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.openid || user.openid.trim() === '') {
      throw new BadRequestException('该用户无微信 openid，无法设置为领队');
    }
    // 已存在有效领队时直接阻断；若仅存在历史档案则走恢复逻辑
    const activeLeader = await this.empRepo.findOne({
      where: { openid: user.openid, role: Role.LEADER, status: 1, is_leader_active: 1 },
    });
    if (activeLeader) throw new BadRequestException('该用户已是领队');

    const historyLeader = await this.empRepo.findOne({
      where: { openid: user.openid, role: Role.LEADER },
      order: { id: 'DESC' },
    });

    // 校验手机号在 employees 表唯一；恢复旧档案时排除自身
    if (dto.phone) {
      const existPhone = await this.empRepo.findOne({ where: { phone: dto.phone } });
      if (existPhone && existPhone.id !== historyLeader?.id) {
        throw new BadRequestException('手机号已被其他员工使用');
      }
    }

    if (historyLeader) {
      historyLeader.name = dto.name;
      historyLeader.phone = dto.phone;
      historyLeader.openid = user.openid;
      historyLeader.avatar = user.avatar || null;
      historyLeader.role = Role.LEADER;
      historyLeader.status = dto.status !== undefined ? +dto.status : 1;
      historyLeader.is_leader_active = 1;
      historyLeader.remark = dto.remark || null;

      const restored = await this.empRepo.save(historyLeader);
      await this.logHelper.write({
        operator,
        module: 'user_admin',
        action: 'set_leader',
        targetId: userId,
        content: `恢复用户 ${user.nickname} 的领队身份为 ${dto.name}`,
      });
      return { id: restored.id, name: restored.name, is_leader: 1 };
    }

    // 创建 employees 记录（role=4，绑定 openid，is_leader_active=1）
    const emp = this.empRepo.create({
      name: dto.name,
      phone: dto.phone,
      openid: user.openid,
      avatar: user.avatar || null,
      role: Role.LEADER,
      status: dto.status !== undefined ? +dto.status : 1,
      is_leader_active: 1,
      remark: dto.remark || null,
    });
    const saved = await this.empRepo.save(emp);
    await this.logHelper.write({
      operator,
      module: 'user_admin',
      action: 'set_leader',
      targetId: userId,
      content: `将用户 ${user.nickname} 设置为领队 ${dto.name}`,
    });
    return { id: saved.id, name: saved.name, is_leader: 1 };
  }

  // 取消领队身份：校验用户存在、是领队、无进行中订单（status in 30/40/60），is_leader_active 置 0
  async cancelLeader(userId: number, operator: OperatorInfo) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.openid || user.openid.trim() === '') {
      throw new BadRequestException('该用户无微信 openid，非领队用户');
    }
    // 查找有效领队 employee
    const leader = await this.empRepo.findOne({
      where: { openid: user.openid, role: Role.LEADER, status: 1, is_leader_active: 1 },
    });
    if (!leader) throw new BadRequestException('该用户不是领队');
    // 校验是否有进行中订单（status in 30/40/60）
    const activeOrder = await this.orderRepo.findOne({
      where: { leader_id: leader.id, status: OrderStatus.PENDING_DOOR },
    });
    if (activeOrder) throw new BadRequestException('该领队有待上门订单，无法取消领队身份');
    const inServiceOrder = await this.orderRepo.findOne({
      where: { leader_id: leader.id, status: OrderStatus.IN_SERVICE },
    });
    if (inServiceOrder) throw new BadRequestException('该领队有服务中订单，无法取消领队身份');
    const pendingFinalOrder = await this.orderRepo.findOne({
      where: { leader_id: leader.id, status: OrderStatus.PENDING_FINAL },
    });
    if (pendingFinalOrder) throw new BadRequestException('该领队有待付尾款订单，无法取消领队身份');
    // is_leader_active 置 0
    await this.empRepo.update(leader.id, { is_leader_active: 0 });
    await this.logHelper.write({
      operator,
      module: 'user_admin',
      action: 'cancel_leader',
      targetId: userId,
      content: `取消用户 ${user.nickname} 的领队身份`,
    });
    return { id: leader.id, is_leader: 0 };
  }
}

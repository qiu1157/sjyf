import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderEmployee } from '../../entities/order-employee.entity';
import { OrderMaterial } from '../../entities/order-material.entity';
import { OrderPhoto } from '../../entities/order-photo.entity';
import { OrderAdjustment } from '../../entities/order-adjustment.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { UserAddress } from '../../entities/user-address.entity';
import { Material } from '../../entities/material.entity';
import { Employee } from '../../entities/employee.entity';
import { UserCoupon } from '../../entities/user-coupon.entity';
import { Coupon } from '../../entities/coupon.entity';
import { OrderStatus } from '../../common/constants/order-status.constants';
import { OrderHistoryService } from './order-history.service';
import { PaymentService } from '../payment/payment.service';

const PLAN_AREA_CONFIG = [
  { key: 'entrance', name: '玄关' },
  { key: 'living_room', name: '客厅' },
  { key: 'kitchen', name: '厨房' },
  { key: 'master_wardrobe', name: '主卧衣柜' },
  { key: 'second_room', name: '次卧/儿童房' },
  { key: 'bathroom', name: '卫生间' },
  { key: 'other', name: '其他区域' },
] as const;

const USER_ORDER_TAB_STATUS_MAP: Record<string, number[]> = {
  pending_pay: [OrderStatus.PENDING_PAY],
  in_service: [OrderStatus.PENDING_ACCEPT, OrderStatus.PENDING_DOOR, OrderStatus.IN_SERVICE],
  pending_final: [OrderStatus.PENDING_FINAL],
  completed: [OrderStatus.COMPLETED],
  cancelled: [OrderStatus.PENDING_CANCEL, OrderStatus.CANCELLED],
};

type ServicePlanAreaInput = {
  area_key: string;
  area_name?: string;
  plan_hours?: number;
  plan_content?: string;
};

type ServicePlanDetailInput = {
  areas?: ServicePlanAreaInput[];
};

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderEmployee) private oeRepo: Repository<OrderEmployee>,
    @InjectRepository(OrderMaterial) private omRepo: Repository<OrderMaterial>,
    @InjectRepository(OrderPhoto) private opRepo: Repository<OrderPhoto>,
    @InjectRepository(OrderAdjustment) private oaRepo: Repository<OrderAdjustment>,
    @InjectRepository(ServiceItem) private itemRepo: Repository<ServiceItem>,
    @InjectRepository(UserAddress) private addrRepo: Repository<UserAddress>,
    @InjectRepository(Material) private materialRepo: Repository<Material>,
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(UserCoupon) private ucRepo: Repository<UserCoupon>,
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
    private orderHistoryService: OrderHistoryService,
    @Inject(forwardRef(() => PaymentService)) private paymentService?: PaymentService,
  ) {}

  /** 生成订单号 */
  private async genOrderNo() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const prefix = `SJ${ymd}`;
    const latest = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.order_no LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('LENGTH(o.order_no) = :orderNoLen', { orderNoLen: prefix.length + 3 })
      .orderBy('o.order_no', 'DESC')
      .getOne();
    const nextSeq = latest?.order_no ? Number(latest.order_no.slice(-3)) + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
  }

  /**
   * 创建订单
   */
  async create(userId: number, dto: {
    service_item_id: number;
    book_date: string;
    book_time: string;
    address_id: number;
    user_remark?: string;
    user_coupon_id?: number;
  }) {
    const item = await this.itemRepo.findOne({ where: { id: dto.service_item_id } });
    if (!item || item.status !== 1 || item.is_deleted === 1) throw new BadRequestException('服务不可用');

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dto.book_date < todayStr) {
      throw new BadRequestException('预约日期不能早于今天');
    }

    const addr = await this.addrRepo.findOne({ where: { id: dto.address_id } });
    if (!addr || addr.user_id !== userId) throw new BadRequestException('地址无效');

    // US-U02：MVP 下单不使用优惠券，首付款为服务全额，尾款初始为 0
    const total = +item.price;
    const discount = 0;
    const couponId: number = null;
    const firstPayment = total;
    const finalPayment = 0;

    const addressSnapshot = {
      id: addr.id,
      contact_name: addr.contact_name,
      contact_phone: addr.contact_phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail: addr.detail,
      full_address: `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detail || ''}`.trim(),
      service_address: `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.detail || ''}`.trim(),
    };

    const order = this.orderRepo.create({
      order_no: await this.genOrderNo(),
      user_id: userId,
      service_item_id: item.id,
      service_name: item.name,
      service_price: item.price,
      book_date: dto.book_date,
      book_time: dto.book_time,
      address_id: addr.id,
      address_snapshot: JSON.stringify(addressSnapshot),
      user_remark: dto.user_remark,
      status: OrderStatus.PENDING_PAY,
      first_payment: firstPayment,
      final_payment: finalPayment,
      total_amount: total,
      discount_amount: discount,
      coupon_id: couponId,
    });
    const saved = await this.orderRepo.save(order);
    await this.orderHistoryService.record(
      saved.id,
      1,
      null,
      String(OrderStatus.PENDING_PAY),
      userId,
      0,
      null,
      '用户创建订单',
    );
    return saved;
  }

  /** 用户端订单列表 */
  async userList(userId: number, q: { tab?: string; status?: number; page?: number; pageSize?: number }) {
    const qb = this.orderRepo.createQueryBuilder('o').where('o.user_id = :uid', { uid: userId });
    const tabStatuses = q.tab ? USER_ORDER_TAB_STATUS_MAP[String(q.tab)] : undefined;
    if (q.status !== undefined) {
      qb.andWhere('o.status = :s', { s: q.status });
    } else if (tabStatuses?.length) {
      qb.andWhere('o.status IN (:...statuses)', { statuses: tabStatuses });
    }
    qb.orderBy('o.id', 'DESC');
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  private async getUserOrderOrThrow(userId: number, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.user_id !== userId) {
      throw new BadRequestException('订单不存在或非本人');
    }
    return order;
  }

  private buildTimelineEvents(order: any) {
    const events = [];
    events.push({ time: order.created_at, title: '订单创建', desc: '订单已创建' });
    if (order.first_pay_time) {
      events.push({ time: order.first_pay_time, title: '首款已付', desc: `支付 ¥${order.first_payment}` });
    }
    if (order.accept_time) {
      events.push({ time: order.accept_time, title: '已接单', desc: '主管已接单分配' });
    }
    if (order.sign_in_time) {
      events.push({ time: order.sign_in_time, title: '领队签到', desc: '领队已到达现场' });
    }
    if (order.complete_time) {
      events.push({ time: order.complete_time, title: '服务完成', desc: '请进行验收' });
    }
    if (order.final_pay_time) {
      events.push({ time: order.final_pay_time, title: '尾款已付', desc: `支付 ¥${order.final_payment}` });
    }
    if (order.cancel_time) {
      events.push({ time: order.cancel_time, title: '订单取消', desc: order.cancel_reason });
    }
    return events;
  }

  async userDetail(userId: number, orderId: number) {
    const order = await this.getUserOrderOrThrow(userId, orderId);
    return { order };
  }

  async listUserAdjustments(userId: number, orderId: number) {
    await this.getUserOrderOrThrow(userId, orderId);
    return this.oaRepo.find({
      where: { order_id: orderId, is_deleted: 0 },
      order: { id: 'DESC' },
    });
  }

  async userTimeline(userId: number, orderId: number) {
    const order = await this.getUserOrderOrThrow(userId, orderId);
    return this.buildTimelineEvents(order);
  }

  private normalizeAdminQueryText(value: unknown) {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim();
  }

  /** 管理端订单列表 */
  async adminList(q: any) {
    const qb = this.orderRepo.createQueryBuilder('o');
    const orderNo = this.normalizeAdminQueryText(q.order_no);
    const keyword = this.normalizeAdminQueryText(q.keyword);
    const userKeyword = this.normalizeAdminQueryText(q.user_keyword);
    const bookDateStart = this.normalizeAdminQueryText(q.book_date_start || q.start_date);
    const bookDateEnd = this.normalizeAdminQueryText(q.book_date_end || q.end_date);
    const createdAtStart = this.normalizeAdminQueryText(q.created_at_start);
    const createdAtEnd = this.normalizeAdminQueryText(q.created_at_end);

    if (q.status !== undefined && q.status !== '') {
      qb.andWhere('o.status = :s', { s: +q.status });
    }
    if (orderNo) {
      qb.andWhere('o.order_no = :orderNo', { orderNo });
    }
    if (keyword) {
      qb.andWhere('(o.order_no LIKE :kw OR o.service_name LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (userKeyword) {
      qb.andWhere('o.address_snapshot LIKE :userKw', { userKw: `%${userKeyword}%` });
    }
    if (q.service_item_id !== undefined && q.service_item_id !== '') {
      qb.andWhere('o.service_item_id = :serviceItemId', { serviceItemId: +q.service_item_id });
    }
    if (q.leader_id !== undefined && q.leader_id !== '') {
      qb.andWhere('o.leader_id = :lid', { lid: +q.leader_id });
    }
    if (bookDateStart) {
      qb.andWhere('o.book_date >= :bookDateStart', { bookDateStart });
    }
    if (bookDateEnd) {
      qb.andWhere('o.book_date <= :bookDateEnd', { bookDateEnd });
    }
    if (createdAtStart) {
      qb.andWhere('o.created_at >= :createdAtStart', {
        createdAtStart: `${createdAtStart} 00:00:00`,
      });
    }
    if (createdAtEnd) {
      qb.andWhere('o.created_at <= :createdAtEnd', {
        createdAtEnd: `${createdAtEnd} 23:59:59`,
      });
    }
    qb.orderBy('o.id', 'DESC');
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 领队订单列表 */
  async leaderList(leaderId: number, q: any) {
    const qb = this.orderRepo.createQueryBuilder('o').where('o.leader_id = :lid', { lid: leaderId });
    if (q.status !== undefined && q.status !== '') qb.andWhere('o.status = :s', { s: +q.status });
    qb.orderBy('o.book_date', 'DESC');
    const [list, total] = await qb.getManyAndCount();
    return { list, total };
  }

  async detail(id: number, leaderId?: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (leaderId && order.leader_id !== leaderId) {
      throw new BadRequestException('订单不存在或非本人');
    }
    const [employees, materials, photos, adjustments] = await Promise.all([
      this.oeRepo.find({ where: { order_id: id } }),
      this.omRepo.find({ where: { order_id: id } }),
      this.opRepo.find({ where: { order_id: id }, order: { sort: 'ASC' } }),
      this.oaRepo.find({ where: { order_id: id, is_deleted: 0 }, order: { id: 'DESC' } }),
    ]);
    // 富化人员
    const empIds = employees.map(e => e.employee_id);
    let empMap = {};
    if (empIds.length) {
      const emps = await this.empRepo.find({ where: { id: In(empIds) } });
      emps.forEach(e => { delete e.password; empMap[e.id] = e; });
    }
    const employeesEnriched = employees.map(e => ({ ...e, employee: empMap[e.employee_id] }));
    return { order, employees: employeesEnriched, materials, photos, adjustments };
  }

  async listAdminHistories(id: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return this.orderHistoryService.listByOrder(id);
  }

  /** 用户取消订单 */
  async userCancel(userId: number, id: number, reason: string) {
    const order = await this.getUserOrderOrThrow(userId, id);
    const cancelReason = String(reason || '').trim();
    if (!cancelReason) {
      throw new BadRequestException('取消原因不能为空');
    }
    const unsupportedCancelStatuses = [
      OrderStatus.IN_SERVICE,
      OrderStatus.PENDING_FINAL,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
      OrderStatus.PENDING_CANCEL,
    ] as number[];
    if (unsupportedCancelStatuses.includes(order.status)) {
      throw new BadRequestException('当前状态不支持取消');
    }

    const prevStatus = order.status;
    if (order.status === OrderStatus.PENDING_PAY) {
      order.status = OrderStatus.CANCELLED;
      order.cancel_time = new Date();
      order.cancel_reason = cancelReason;
      const saved = await this.orderRepo.save(order);
      await this.orderHistoryService.record(
        saved.id,
        1,
        String(prevStatus),
        String(OrderStatus.CANCELLED),
        userId,
        0,
        null,
        cancelReason,
      );
      return saved;
    }

    const auditCancelStatuses = [OrderStatus.PENDING_ACCEPT, OrderStatus.PENDING_DOOR] as number[];
    if (auditCancelStatuses.includes(order.status)) {
      order.prev_status = prevStatus;
      order.status = OrderStatus.PENDING_CANCEL;
      order.cancel_apply_time = new Date();
      order.cancel_reason = cancelReason;
      const saved = await this.orderRepo.save(order);
      await this.orderHistoryService.record(
        saved.id,
        1,
        String(prevStatus),
        String(OrderStatus.PENDING_CANCEL),
        userId,
        0,
        null,
        cancelReason,
      );
      return saved;
    }

    throw new BadRequestException('当前状态不支持取消');
  }

  /** 取消订单 */
  async cancel(id: number, reason: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status >= OrderStatus.IN_SERVICE) throw new BadRequestException('订单已进入服务阶段，无法直接取消');
    order.status = OrderStatus.CANCELLED;
    order.cancel_time = new Date();
    order.cancel_reason = reason;
    return this.orderRepo.save(order);
  }

  /** 主管审核取消申请 */
  async cancelAudit(id: number, operatorId: number, body: { approved: boolean; remark?: string }) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING_CANCEL) {
      throw new BadRequestException('当前状态不允许取消审核');
    }

    const approved = body?.approved === true;
    const remark = String(body?.remark || '').trim();
    const prevStatus = Number(order.prev_status || OrderStatus.PENDING_DOOR);
    const auditTime = new Date();

    if (approved) {
      await this.paymentService?.refundFirstPayment(order.id, remark || '主管审核通过取消退款');
      order.status = OrderStatus.CANCELLED;
      order.refund_amount = Number(order.first_payment || 0);
      order.cancel_time = auditTime;
      order.cancel_audit_time = auditTime;
      order.cancel_audit_remark = remark;
      const saved = await this.orderRepo.save(order);
      await this.orderHistoryService.record(
        saved.id,
        1,
        String(OrderStatus.PENDING_CANCEL),
        String(OrderStatus.CANCELLED),
        operatorId,
        3,
        null,
        `审核通过，退款¥${Number(saved.refund_amount || 0)}`,
      );
      return saved;
    }

    order.status = prevStatus;
    order.cancel_audit_time = auditTime;
    order.cancel_audit_remark = remark;
    const saved = await this.orderRepo.save(order);
    await this.orderHistoryService.record(
      saved.id,
      1,
      String(OrderStatus.PENDING_CANCEL),
      String(prevStatus),
      operatorId,
      3,
      null,
      `审核拒绝：${remark || '无备注'}`,
    );
    return saved;
  }

  /** 主管接单 */
  async accept(id: number, operatorId: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.PENDING_ACCEPT) throw new BadRequestException('订单状态不允许接单');
    const prevStatus = order.status;
    order.status = OrderStatus.PENDING_DOOR;
    order.accept_time = new Date();
    order.supervisor_id = operatorId;
    const saved = await this.orderRepo.save(order);
    await this.orderHistoryService.record(
      saved.id,
      1,
      String(prevStatus),
      String(OrderStatus.PENDING_DOOR),
      operatorId,
      1,
      null,
      '主管接单',
    );
    return saved;
  }

  /** 制定服务方案 */
  private normalizeServicePlanDetail(detail: ServicePlanDetailInput) {
    const areaMap = new Map((detail?.areas || []).map((item) => [item.area_key, item]));
    const normalizedAreas = PLAN_AREA_CONFIG.map(({ key, name }) => {
      const rawArea = areaMap.get(key);
      if (!rawArea) {
        throw new BadRequestException(`缺少${name}方案配置`);
      }

      const planHours = Number(rawArea.plan_hours ?? 0);
      if (!Number.isFinite(planHours) || planHours < 0) {
        throw new BadRequestException(`${name}计划工时无效`);
      }

      const planContent = typeof rawArea.plan_content === 'string' ? rawArea.plan_content.trim() : '';
      if (planContent.length > 500) {
        throw new BadRequestException(`${name}方案内容不能超过500字符`);
      }

      return {
        area_key: key,
        area_name: name,
        plan_hours: planHours,
        plan_content: planContent,
      };
    });

    return {
      areas: normalizedAreas,
      total_plan_hours: normalizedAreas.reduce((sum, item) => sum + item.plan_hours, 0),
    };
  }

  async plan(id: number, dto: {
    leader_id: number;
    employee_ids: number[];
    material_list: { material_id: number; quantity: number }[];
    book_date?: string;
    book_time?: string;
    service_plan_detail: ServicePlanDetailInput;
  }, operatorId?: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('订单不存在');

    const leader = await this.empRepo.findOne({ where: { id: dto.leader_id } });
    if (!leader || leader.role !== 4 || leader.status !== 1 || leader.is_leader_active !== 1) {
      throw new BadRequestException('领队无效');
    }

    const normalizedPlanDetail = this.normalizeServicePlanDetail(dto.service_plan_detail);
    const employeeIds = Array.from(new Set([dto.leader_id, ...(dto.employee_ids || [])]));
    if (!employeeIds.length) {
      throw new BadRequestException('请至少选择1名服务人员');
    }

    const employees = await this.empRepo.find({ where: { id: In(employeeIds) } });
    if (employees.length !== employeeIds.length) {
      throw new BadRequestException('服务人员无效');
    }
    employees.forEach((employee) => {
      if (employee.status !== 1 || ![4, 5].includes(employee.role)) {
        throw new BadRequestException('服务人员无效');
      }
    });

    const materialList = dto.material_list || [];
    let materialMap = new Map<number, Material>();
    if (materialList.length) {
      const materialIds = Array.from(new Set(materialList.map((item) => item.material_id)));
      const materials = await this.materialRepo.find({ where: { id: In(materialIds) } });
      if (materials.length !== materialIds.length || materials.some((item) => item.status !== 1)) {
        throw new BadRequestException('物料无效');
      }
      materialMap = new Map(materials.map((item) => [item.id, item]));
    }

    order.leader_id = dto.leader_id;
    order.plan_hours = normalizedPlanDetail.total_plan_hours;
    order.service_plan_detail = JSON.stringify({ areas: normalizedPlanDetail.areas });
    order.service_plan = null;
    const prevStatus = order.status;
    if (order.status === OrderStatus.PENDING_ACCEPT) {
      const nextBookDate = String(dto.book_date || order.book_date || '').trim();
      const nextBookTime = String(dto.book_time || order.book_time || '').trim();
      if (dto.book_date || dto.book_time) {
        if (!nextBookDate || !nextBookTime) {
          throw new BadRequestException('预约日期和时段不能为空');
        }
        if (new Date(nextBookDate) < new Date(new Date().toDateString())) {
          throw new BadRequestException('预约日期不能早于今天');
        }
        await this.orderHistoryService.record(
          id,
          2,
          `${order.book_date} ${order.book_time}`,
          `${nextBookDate} ${nextBookTime}`,
          operatorId || 0,
          1,
          null,
          '主管接单改期',
        );
        order.book_date = nextBookDate;
        order.book_time = nextBookTime;
      }
      order.status = OrderStatus.PENDING_DOOR;
      order.accept_time = new Date();
      if (operatorId) {
        order.supervisor_id = operatorId;
      }
    }
    await this.orderRepo.save(order);
    if (prevStatus === OrderStatus.PENDING_ACCEPT) {
      await this.orderHistoryService.record(
        id,
        1,
        String(OrderStatus.PENDING_ACCEPT),
        String(OrderStatus.PENDING_DOOR),
        operatorId || 0,
        1,
        null,
        '主管接单',
      );
    }

    // 清除旧关联
    await this.oeRepo.delete({ order_id: id });
    await this.omRepo.delete({ order_id: id, is_extra: 0 });

    // 创建人员关联
    const empRows = employeeIds.map(eid => this.oeRepo.create({
      order_id: id, employee_id: eid, is_leader: eid === dto.leader_id ? 1 : 0,
    }));
    await this.oeRepo.save(empRows);

    // 创建物料关联
    if (materialList.length) {
      const matRows = materialList.map(m => this.omRepo.create({
        order_id: id, material_id: m.material_id,
        material_name: materialMap.get(m.material_id)?.name || '',
        quantity: m.quantity, is_extra: 0,
      }));
      await this.omRepo.save(matRows);
    }
    return this.detail(id);
  }

  /** 改期 */
  async reschedule(id: number, book_date: string, book_time: string) {
    await this.orderRepo.update(id, { book_date, book_time });
    return this.orderRepo.findOne({ where: { id } });
  }

  private async getLeaderInServiceOrderOrThrow(orderId: number, leaderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.leader_id !== leaderId) {
      throw new BadRequestException('订单不存在或非本人');
    }
    if (order.status !== OrderStatus.IN_SERVICE) {
      throw new BadRequestException('仅服务中订单可操作');
    }
    return order;
  }

  async confirmStaff(
    orderId: number,
    leaderId: number,
    body: { employees?: Array<{ employee_id: number; arrived: boolean }>; remark?: string },
  ) {
    const order = await this.getLeaderInServiceOrderOrThrow(orderId, leaderId);
    const employeeRows = await this.oeRepo.find({ where: { order_id: orderId } });
    const employeePayload = Array.isArray(body?.employees) ? body.employees : [];
    const employeeMap = new Map(employeePayload.map((item) => [Number(item.employee_id), item]));
    const invalidEmployee = employeePayload.find((item) => !employeeRows.some((row) => row.employee_id === Number(item.employee_id)));

    if (invalidEmployee) {
      throw new BadRequestException('服务人员无效');
    }

    const now = new Date();
    const savedRows = await this.oeRepo.save(employeeRows.map((row) => {
      const payload = employeeMap.get(Number(row.employee_id));
      if (!payload) {
        return row;
      }
      const arrived = payload.arrived === true;
      return {
        ...row,
        arrived_at: arrived ? now : null,
        arrived_by: arrived ? leaderId : null,
      };
    }));

    order.staff_check_remark = String(body?.remark || '').trim();
    const savedOrder = await this.orderRepo.save(order);
    return {
      order: savedOrder,
      employees: savedRows,
    };
  }

  async confirmMaterials(
    orderId: number,
    leaderId: number,
    body: { materials?: Array<{ order_material_id: number; checked: boolean }>; remark?: string },
  ) {
    const order = await this.getLeaderInServiceOrderOrThrow(orderId, leaderId);
    const materialRows = await this.omRepo.find({ where: { order_id: orderId } });
    const materialPayload = Array.isArray(body?.materials) ? body.materials : [];
    const materialMap = new Map(materialPayload.map((item) => [Number(item.order_material_id), item]));
    const invalidMaterial = materialPayload.find((item) => !materialRows.some((row) => row.id === Number(item.order_material_id)));

    if (invalidMaterial) {
      throw new BadRequestException('物料无效');
    }

    const now = new Date();
    const savedRows = await this.omRepo.save(materialRows.map((row) => {
      const payload = materialMap.get(Number(row.id));
      if (!payload) {
        return row;
      }
      const checked = payload.checked === true ? 1 : 0;
      return {
        ...row,
        checked,
        checked_at: checked ? now : null,
        checked_by: checked ? leaderId : null,
      };
    }));

    order.material_check_remark = String(body?.remark || '').trim();
    const savedOrder = await this.orderRepo.save(order);
    return {
      order: savedOrder,
      materials: savedRows,
    };
  }

  /** 领队签到 */
  async signIn(id: number, leaderId: number) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order || order.leader_id !== leaderId) throw new BadRequestException('订单不存在或非本人');
    if (order.status !== OrderStatus.PENDING_DOOR) throw new BadRequestException('订单状态不允许签到');
    const prevStatus = order.status;
    order.status = OrderStatus.IN_SERVICE;
    order.sign_in_time = new Date();
    const saved = await this.orderRepo.save(order);
    await this.orderHistoryService.record(
      saved.id,
      1,
      String(prevStatus),
      String(OrderStatus.IN_SERVICE),
      leaderId,
      4,
      null,
      '领队签到',
    );
    return saved;
  }

  /** 上传照片 */
  async addPhotos(orderId: number, uploadedBy: number, photos: { photo_type: number; space_name?: string; photo_url: string }[]) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.leader_id !== uploadedBy) {
      throw new BadRequestException('订单不存在或非本人');
    }
    if (order.status !== OrderStatus.IN_SERVICE) {
      throw new BadRequestException('仅服务中订单可上传照片');
    }

    const rows = photos.map(p => this.opRepo.create({
      ...(p.space_name?.trim() ? {} : (() => { throw new BadRequestException('空间名称不能为空'); })()),
      ...([1, 2].includes(p.photo_type) ? {} : (() => { throw new BadRequestException('照片类型无效'); })()),
      order_id: orderId,
      photo_type: p.photo_type,
      space_name: p.space_name?.trim(),
      photo_url: p.photo_url,
      uploaded_by: uploadedBy,
    }));
    return this.opRepo.save(rows);
  }

  async deletePhoto(orderId: number, photoId: number, leaderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.leader_id !== leaderId) {
      throw new BadRequestException('订单不存在或非本人');
    }

    const photo = await this.opRepo.findOne({ where: { id: photoId, order_id: orderId } });
    if (!photo || photo.uploaded_by !== leaderId) {
      throw new BadRequestException('照片不存在或无权删除');
    }

    await this.opRepo.delete({ id: photoId });
    return { id: photoId };
  }

  async listPhotos(orderId: number, leaderId?: number) {
    if (leaderId) {
      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!order || order.leader_id !== leaderId) {
        throw new BadRequestException('订单不存在或非本人');
      }
    }
    return this.opRepo.find({ where: { order_id: orderId }, order: { sort: 'ASC' } });
  }

  /** 临时增项 */
  async addAdjustment(orderId: number, operatorId: number, dto: {
    adjust_type: number;
    service_item_id?: number;
    service_name?: string;
    adjust_amount?: number;
    material_id?: number;
    material_quantity?: number;
    remark?: string;
  }) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== OrderStatus.IN_SERVICE) {
      throw new BadRequestException('仅服务中订单可录入增项');
    }
    if (order.leader_id !== operatorId) {
      throw new BadRequestException('订单不存在或非本人');
    }

    const operator = await this.empRepo.findOne({ where: { id: operatorId } });
    let service_name = dto.service_name?.trim() || null;
    let material_name = null;
    if (dto.service_item_id) {
      const item = await this.itemRepo.findOne({ where: { id: dto.service_item_id } });
      if (!item || item.status !== 1 || item.is_deleted === 1 || item.leader_selectable !== 1) {
        throw new BadRequestException('服务不可选');
      }
      service_name = item.name;
    }
    if (dto.material_id) {
      const m = await this.materialRepo.findOne({ where: { id: dto.material_id } });
      if (!m || m.status !== 1) {
        throw new BadRequestException('物料不可选');
      }
      material_name = m?.name;
      const quantity = Number(dto.material_quantity || 0);
      if (quantity <= 0) {
        throw new BadRequestException('物料数量必须大于0');
      }
    }
    if (!service_name && !material_name) {
      throw new BadRequestException('请至少选择服务或物料');
    }
    const adj = this.oaRepo.create({
      order_id: orderId,
      adjust_type: dto.adjust_type,
      service_item_id: dto.service_item_id,
      service_name,
      adjust_amount: dto.adjust_amount || 0,
      material_id: dto.material_id,
      material_name,
      material_quantity: dto.material_quantity || 0,
      remark: dto.remark,
      operator_id: operatorId,
      operator_name: operator?.name || '领队',
    });
    const saved = await this.oaRepo.save(adj);
    if (dto.material_id) {
      await this.omRepo.save(this.omRepo.create({
        order_id: orderId,
        adjustment_id: saved.id,
        material_id: dto.material_id,
        material_name,
        quantity: Number(dto.material_quantity || 0),
        is_extra: 1,
      }));
    }
    // 累计金额
    if (dto.adjust_amount) {
      order.extra_amount = +order.extra_amount + +dto.adjust_amount;
      order.total_amount = +order.total_amount + +dto.adjust_amount;
      order.final_payment = +order.final_payment + +dto.adjust_amount;
      await this.orderRepo.save(order);
    }
    return saved;
  }

  async listAdjustments(orderId: number) {
    return this.oaRepo.find({ where: { order_id: orderId, is_deleted: 0 }, order: { id: 'DESC' } });
  }

  async confirmAdjustment(adjId: number) {
    await this.oaRepo.update(adjId, { user_confirmed: 1 });
    return this.oaRepo.findOne({ where: { id: adjId } });
  }

  private async getLeaderEditableAdjustmentOrThrow(orderId: number, adjId: number, leaderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order || order.leader_id !== leaderId) {
      throw new BadRequestException('订单不存在或非本人');
    }
    if (order.status !== OrderStatus.IN_SERVICE) {
      throw new BadRequestException('仅服务中订单可操作');
    }
    const adjustment = await this.oaRepo.findOne({ where: { id: adjId, order_id: orderId } });
    if (!adjustment || Number(adjustment.is_deleted || 0) === 1) {
      throw new BadRequestException('增项不存在');
    }
    return { order, adjustment };
  }

  private async findLinkedExtraMaterial(adjustment: OrderAdjustment) {
    const byAdjustmentId = await this.omRepo.findOne({
      where: { order_id: adjustment.order_id, adjustment_id: adjustment.id, is_extra: 1 },
    });
    if (byAdjustmentId) {
      return byAdjustmentId;
    }
    return this.omRepo.findOne({
      where: {
        order_id: adjustment.order_id,
        material_id: adjustment.material_id,
        material_name: adjustment.material_name,
        quantity: adjustment.material_quantity,
        is_extra: 1,
      },
    });
  }

  private async recalculateAdjustmentAmounts(order: Order) {
    const activeAdjustments = await this.oaRepo.find({ where: { order_id: order.id, is_deleted: 0 } });
    const baseAmount = Number(order.total_amount || 0) - Number(order.extra_amount || 0);
    const nextExtraAmount = activeAdjustments.reduce((sum, item) => sum + Number(item.adjust_amount || 0), 0);
    order.extra_amount = Number(nextExtraAmount.toFixed(2));
    order.final_payment = Number(nextExtraAmount.toFixed(2));
    order.total_amount = Number((baseAmount + nextExtraAmount).toFixed(2));
    return this.orderRepo.save(order);
  }

  async updateAdjustment(orderId: number, adjId: number, operatorId: number, dto: {
    adjust_type?: number;
    service_item_id?: number;
    service_name?: string;
    adjust_amount?: number;
    material_id?: number;
    material_quantity?: number;
    remark?: string;
  }) {
    const { order, adjustment } = await this.getLeaderEditableAdjustmentOrThrow(orderId, adjId, operatorId);
    const currentType = Number(adjustment.adjust_type || 0);
    const nextType = dto.adjust_type === undefined ? currentType : Number(dto.adjust_type || 0);
    if (currentType !== nextType) {
      throw new BadRequestException('仅支持同类型修改');
    }

    const operator = await this.empRepo.findOne({ where: { id: operatorId } });
    adjustment.remark = String(dto.remark || '').trim();
    adjustment.adjust_amount = Number(dto.adjust_amount || 0);

    if (currentType === 3) {
      const materialId = Number(dto.material_id || 0);
      const quantity = Number(dto.material_quantity || 0);
      if (!materialId || quantity <= 0) {
        throw new BadRequestException('物料信息无效');
      }
      const material = await this.materialRepo.findOne({ where: { id: materialId } });
      if (!material || material.status !== 1) {
        throw new BadRequestException('物料不可选');
      }
      adjustment.material_id = material.id;
      adjustment.material_name = material.name;
      adjustment.material_quantity = quantity;

      const linkedMaterial = await this.findLinkedExtraMaterial(adjustment);
      if (linkedMaterial) {
        await this.omRepo.save({
          ...linkedMaterial,
          adjustment_id: adjustment.id,
          material_id: material.id,
          material_name: material.name,
          quantity,
        });
      }
    } else {
      let serviceName = String(dto.service_name || '').trim();
      adjustment.service_item_id = Number(dto.service_item_id || 0) || null;
      if (adjustment.service_item_id) {
        const item = await this.itemRepo.findOne({ where: { id: adjustment.service_item_id } });
        if (!item || item.status !== 1 || item.is_deleted === 1 || item.leader_selectable !== 1) {
          throw new BadRequestException('服务不可选');
        }
        serviceName = item.name;
      }
      if (!serviceName) {
        throw new BadRequestException('服务名称不能为空');
      }
      adjustment.service_name = serviceName;
    }

    const saved = await this.oaRepo.save(adjustment);
    await this.recalculateAdjustmentAmounts(order);
    await this.orderHistoryService.record(
      order.id,
      1,
      null,
      null,
      operatorId,
      4,
      operator?.name || '领队',
      `修改增项：${saved.service_name || saved.material_name || saved.id}`,
    );
    return saved;
  }

  async deleteAdjustment(orderId: number, adjId: number, operatorId: number) {
    const { order, adjustment } = await this.getLeaderEditableAdjustmentOrThrow(orderId, adjId, operatorId);
    adjustment.is_deleted = 1;
    const saved = await this.oaRepo.save(adjustment);

    if (Number(adjustment.adjust_type || 0) === 3) {
      const linkedMaterial = await this.findLinkedExtraMaterial(adjustment);
      if (linkedMaterial) {
        await this.omRepo.delete({ id: linkedMaterial.id });
      }
    }

    const operator = await this.empRepo.findOne({ where: { id: operatorId } });
    await this.recalculateAdjustmentAmounts(order);
    await this.orderHistoryService.record(
      order.id,
      1,
      null,
      null,
      operatorId,
      4,
      operator?.name || '领队',
      `删除增项：${adjustment.service_name || adjustment.material_name || adjustment.id}`,
    );
    return saved;
  }

  private normalizeAcceptanceHours(value: unknown, label: string) {
    if (value === '' || value === null || value === undefined) {
      throw new BadRequestException(`请填写${label}`);
    }

    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 0) {
      throw new BadRequestException(`${label}无效`);
    }

    return Number(hours.toFixed(1));
  }

  /** 验收 */
  async acceptance(
    id: number,
    leaderId: number,
    dto: { plan_actual_hours: number; extra_actual_hours: number },
  ) {
    const order = await this.orderRepo.findOne({ where: { id, leader_id: leaderId } });
    if (!order) throw new NotFoundException('订单不存在或非本人');
    if (order.status !== OrderStatus.IN_SERVICE) {
      throw new BadRequestException('订单状态不允许验收');
    }

    const planActualHours = this.normalizeAcceptanceHours(dto?.plan_actual_hours, '实际方案工时');
    const extraActualHours = this.normalizeAcceptanceHours(dto?.extra_actual_hours, '增项工时');
    const actualHours = Number((planActualHours + extraActualHours).toFixed(1));

    order.plan_actual_hours = planActualHours;
    order.extra_actual_hours = extraActualHours;
    order.actual_hours = actualHours;

    if (+order.extra_amount === 0) {
      order.status = OrderStatus.COMPLETED;
      order.complete_time = new Date();
    } else {
      order.status = OrderStatus.PENDING_FINAL;
      order.final_payment = +order.extra_amount;
      order.complete_time = null;
    }

    const saved = await this.orderRepo.save(order);
    await this.orderHistoryService.record(
      saved.id,
      1,
      String(OrderStatus.IN_SERVICE),
      String(saved.status),
      leaderId,
      4,
      null,
      `验收提交，方案工时${planActualHours}h，增项工时${extraActualHours}h，实际总工时${actualHours}h`,
    );
    return saved;
  }
}

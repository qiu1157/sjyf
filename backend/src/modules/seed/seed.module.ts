import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  User, ServiceCategory, ServiceItem, Employee, Material, Coupon, Order, UserCoupon, UserAddress,
  RoleMenuPermission,
} from '../../entities';
import { SUPERVISOR_DEFAULT_MENUS } from '../../common/constants/menu-keys.constants';
import { OrderStatus } from '../../common/constants/order-status.constants';

/** 模拟订单生成配置：保证数据看板有足够历史数据展示 */
const MOCK_ORDER_DAYS = 30;
const MOCK_MIN_PER_DAY = 2;
const MOCK_MAX_PER_DAY = 4;
const MOCK_ORDER_THRESHOLD = MOCK_ORDER_DAYS * MOCK_MIN_PER_DAY;
const BOOK_TIME_SLOTS = ['08:00-12:00', '09:00-13:00', '13:00-17:00', '13:00-19:00', '14:00-18:00'];
const PLAN_HOURS_OPTIONS = [4, 5, 6, 8];

function isSeedEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.ENABLE_SEED === 'true') return true;
  if (env.ENABLE_SEED === 'false') return false;
  return env.NODE_ENV !== 'production';
}

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserAddress) private addrRepo: Repository<UserAddress>,
    @InjectRepository(ServiceCategory) private catRepo: Repository<ServiceCategory>,
    @InjectRepository(ServiceItem) private itemRepo: Repository<ServiceItem>,
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(Material) private matRepo: Repository<Material>,
    @InjectRepository(Coupon) private couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon) private ucRepo: Repository<UserCoupon>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(RoleMenuPermission) private menuRepo: Repository<RoleMenuPermission>,
  ) {}

  async onModuleInit() {
    if (!isSeedEnabled()) {
      console.log('⏭️ 已跳过种子数据初始化：ENABLE_SEED=false');
      return;
    }

    // 员工表为空：首次启动，初始化全部基础数据并生成模拟订单
    if ((await this.empRepo.count()) === 0) {
      console.log('🌱 正在初始化种子数据...');
      await this.seedAll();
      await this.seedMockOrders();
      console.log('✅ 种子数据初始化完成');
      return;
    }
    // 已有基础数据但订单不足：补充模拟订单，确保看板图表有数据
    const orderCount = await this.orderRepo.count();
    if (orderCount < MOCK_ORDER_THRESHOLD) {
      console.log(`📊 订单数据不足（${orderCount} < ${MOCK_ORDER_THRESHOLD}），正在生成模拟订单...`);
      await this.seedMockOrders();
      console.log('✅ 模拟订单生成完成');
    }
  }

  async seedAll() {
    // 员工
    const pwd = await bcrypt.hash('123456', 10);
    const employees = await this.empRepo.save([
      this.empRepo.create({ name: '系统管理员', username: 'admin', password: pwd, role: 1, status: 1, phone: '13800000001' }),
      this.empRepo.create({ name: '李店长', username: 'manager', password: pwd, role: 2, status: 1, phone: '13800000002' }),
      this.empRepo.create({ name: '王主管', username: 'supervisor', password: pwd, role: 3, status: 1, phone: '13800000003' }),
      this.empRepo.create({ name: '张领队', username: 'leader1', password: pwd, role: 4, status: 1, phone: '13800000004', openid: 'mock_openid_leader1', is_leader_active: 1 }),
      this.empRepo.create({ name: '赵领队', username: 'leader2', password: pwd, role: 4, status: 1, phone: '13800000005', openid: 'mock_openid_leader2', is_leader_active: 1 }),
      this.empRepo.create({ name: '陈阿姨', role: 5, status: 1, phone: '13900000001' }),
      this.empRepo.create({ name: '刘阿姨', role: 5, status: 1, phone: '13900000002' }),
      this.empRepo.create({ name: '黄阿姨', role: 5, status: 1, phone: '13900000003' }),
    ]);

    // 服务品类
    const cats = await this.catRepo.save([
      this.catRepo.create({ name: '日常保洁', sort: 1, description: '日常居家保洁服务' }),
      this.catRepo.create({ name: '深度保洁', sort: 2, description: '深度清洁服务' }),
      this.catRepo.create({ name: '收纳整理', sort: 3, description: '专业收纳师服务' }),
      this.catRepo.create({ name: '开荒保洁', sort: 4, description: '新居开荒清洁' }),
      this.catRepo.create({ name: '家电清洗', sort: 5, description: '空调/油烟机等' }),
      this.catRepo.create({ name: '月嫂育儿', sort: 6, description: '月嫂育儿嫂服务' }),
    ]);

    // 单品服务
    await this.itemRepo.save([
      this.itemRepo.create({ category_id: cats[0].id, name: '日常保洁 4小时', price: 199, duration: 240, description: '1位阿姨 4小时家庭日常保洁', sort: 1 }),
      this.itemRepo.create({ category_id: cats[0].id, name: '日常保洁 6小时', price: 288, duration: 360, description: '1位阿姨 6小时全屋保洁', sort: 2 }),
      this.itemRepo.create({ category_id: cats[1].id, name: '深度保洁套餐 90㎡', price: 698, duration: 360, description: '2位阿姨 全屋深度清洁', sort: 1 }),
      this.itemRepo.create({ category_id: cats[1].id, name: '深度保洁套餐 120㎡', price: 998, duration: 480, description: '2位阿姨 全屋深度+死角', sort: 2 }),
      this.itemRepo.create({ category_id: cats[2].id, name: '收纳整理-衣橱', price: 599, duration: 300, description: '专业收纳师整理衣橱', sort: 1 }),
      this.itemRepo.create({ category_id: cats[2].id, name: '收纳整理-厨房', price: 499, duration: 240, description: '厨房收纳整理', sort: 2 }),
      this.itemRepo.create({ category_id: cats[3].id, name: '开荒保洁-小户型', price: 888, duration: 480, description: '新房入住前彻底清洁', sort: 1 }),
      this.itemRepo.create({ category_id: cats[4].id, name: '空调深度清洗', price: 199, duration: 90, description: '挂式空调清洗消毒', sort: 1 }),
      this.itemRepo.create({ category_id: cats[4].id, name: '油烟机清洗', price: 159, duration: 60, description: '油烟机内部深度清洁', sort: 2 }),
      this.itemRepo.create({ category_id: cats[5].id, name: '月嫂服务 26天', price: 12800, duration: 9999, description: '专业月嫂26天服务', sort: 1 }),
    ]);

    // 物料
    await this.matRepo.save([
      this.matRepo.create({ name: '玻璃水', category: '清洁剂', specification: '500ml', unit: '瓶' }),
      this.matRepo.create({ name: '多功能清洁剂', category: '清洁剂', specification: '500ml', unit: '瓶' }),
      this.matRepo.create({ name: '油烟净', category: '清洁剂', specification: '500ml', unit: '瓶' }),
      this.matRepo.create({ name: '抛光蜡', category: '保养剂', specification: '300ml', unit: '瓶' }),
      this.matRepo.create({ name: '抹布', category: '工具', specification: '30x30cm', unit: '条' }),
      this.matRepo.create({ name: '清洁手套', category: '工具', specification: 'L', unit: '副' }),
      this.matRepo.create({ name: '收纳盒', category: '辅料', specification: '中号', unit: '个' }),
      this.matRepo.create({ name: '空调清洗剂', category: '清洁剂', specification: '500ml', unit: '瓶' }),
    ]);

    // 优惠券
    const coupons = await this.couponRepo.save([
      this.couponRepo.create({ name: '新人立减50元', type: 1, value: 50, min_amount: 200, total_quantity: 1000, valid_days: 30, status: 1 }),
      this.couponRepo.create({ name: '满500减100', type: 1, value: 100, min_amount: 500, total_quantity: 500, valid_days: 60, status: 1 }),
      this.couponRepo.create({ name: '9折券', type: 2, value: 9, min_amount: 200, total_quantity: 300, valid_days: 30, status: 1 }),
    ]);

    // 测试用户
    const user = await this.userRepo.save(this.userRepo.create({
      openid: 'mock_openid_test', nickname: '测试用户', phone: '13912345678', avatar: '',
    }));

    // 用户地址
    await this.addrRepo.save([
      this.addrRepo.create({ user_id: user.id, contact_name: '张先生', contact_phone: '13912345678', province: '上海', city: '上海市', district: '浦东新区', detail: '世纪大道100号 1号楼801', is_default: 1 }),
      this.addrRepo.create({ user_id: user.id, contact_name: '张先生', contact_phone: '13912345678', province: '上海', city: '上海市', district: '徐汇区', detail: '漕溪北路200号 2号楼1502', is_default: 0 }),
    ]);

    // 用户优惠券
    const expire = new Date(Date.now() + 30 * 86400000);
    await this.ucRepo.save([
      this.ucRepo.create({ user_id: user.id, coupon_id: coupons[0].id, expire_time: expire, status: 0 }),
      this.ucRepo.create({ user_id: user.id, coupon_id: coupons[2].id, expire_time: expire, status: 0 }),
    ]);

    // 演示订单
    await this.orderRepo.save([
      this.orderRepo.create({
        order_no: 'SJDEMO0001', user_id: user.id, service_item_id: 1, service_name: '日常保洁 4小时', service_price: 199,
        book_date: new Date().toISOString().slice(0, 10), book_time: '09:00-13:00',
        address_id: 1, status: OrderStatus.PENDING_ACCEPT, first_payment: 60, final_payment: 139, total_amount: 199,
        first_pay_time: new Date(),
      }),
      this.orderRepo.create({
        order_no: 'SJDEMO0002', user_id: user.id, service_item_id: 3, service_name: '深度保洁套餐 90㎡', service_price: 698,
        book_date: new Date().toISOString().slice(0, 10), book_time: '13:00-19:00',
        address_id: 1, status: OrderStatus.PENDING_DOOR, first_payment: 210, final_payment: 488, total_amount: 698,
        first_pay_time: new Date(), accept_time: new Date(),
        leader_id: employees[3].id, supervisor_id: employees[2].id, plan_hours: 6,
        service_plan: '2位阿姨上门，深度清洁全屋',
      }),
    ]);

    // 主管默认菜单权限（数据看板、订单管理、用户信息、人员管理）
    await this.menuRepo.save(
      SUPERVISOR_DEFAULT_MENUS.map(key =>
        this.menuRepo.create({ role: 3, menu_key: key, is_visible: 1 }),
      ),
    );
  }

  /**
   * 生成模拟订单：覆盖最近 MOCK_ORDER_DAYS 天，每天 2-4 单。
   * 订单状态随"年龄"合理分布--早期订单多为已完成/已取消，近期订单多为进行中各阶段。
   * 订单号统一使用 SJMOCK 前缀，避免与真实订单冲突且便于识别清理。
   */
  async seedMockOrders() {
    const [items, addresses, users, leaders, supervisors] = await Promise.all([
      this.itemRepo.find({ where: { status: 1 } }),
      this.addrRepo.find(),
      this.userRepo.find(),
      this.empRepo.find({ where: { role: 4, is_leader_active: 1 } }),
      this.empRepo.find({ where: { role: 3, status: 1 } }),
    ]);
    // 缺少基础数据则跳过，避免生成无意义的订单
    if (!items.length || !addresses.length || !users.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const refs = { items, addresses, users, leaders, supervisors };

    const orders: Order[] = [];
    for (let dayOffset = MOCK_ORDER_DAYS - 1; dayOffset >= 0; dayOffset--) {
      const dayStart = new Date(today.getTime() - dayOffset * 86400000);
      const perDay = this.randomInt(MOCK_MIN_PER_DAY, MOCK_MAX_PER_DAY);
      for (let i = 0; i < perDay; i++) {
        orders.push(this.buildMockOrder(dayStart, dayOffset, i, refs));
      }
    }
    await this.orderRepo.save(orders);
    console.log(`📊 已生成 ${orders.length} 条模拟订单（覆盖最近 ${MOCK_ORDER_DAYS} 天）`);
  }

  /** 构建单条模拟订单，按状态填充价格、人员与各阶段时间 */
  private buildMockOrder(
    dayStart: Date,
    dayOffset: number,
    seqInDay: number,
    refs: {
      items: ServiceItem[];
      addresses: UserAddress[];
      users: User[];
      leaders: Employee[];
      supervisors: Employee[];
    },
  ): Order {
    const item = this.pick(refs.items);
    const addr = this.pick(refs.addresses);
    const user = this.pick(refs.users);
    const status = this.mockStatusByAge(dayOffset);

    // 下单时间落在当天 8-20 点之间，更贴近真实分布
    const createdAt = new Date(dayStart.getTime() + this.randomInt(8, 20) * 3600000);
    const total = +item.price;
    const firstPayment = +(total * 0.3).toFixed(2);
    const finalPayment = +(total - firstPayment).toFixed(2);

    const order = this.orderRepo.create({
      order_no: this.mockOrderNo(dayStart, seqInDay),
      user_id: user.id,
      service_item_id: item.id,
      service_name: item.name,
      service_price: item.price,
      book_date: this.toDateStr(dayStart),
      book_time: this.pick(BOOK_TIME_SLOTS),
      address_id: addr.id,
      address_snapshot: JSON.stringify(addr),
      status,
      first_payment: firstPayment,
      final_payment: finalPayment,
      total_amount: total,
      discount_amount: 0,
      plan_hours: this.pick(PLAN_HOURS_OPTIONS),
      actual_hours: 0,
      created_at: createdAt,
      updated_at: createdAt,
    });

    this.fillMockTimeline(order, status, createdAt, refs);
    return order;
  }

  /** 根据订单距今天数随机确定状态，使看板各阶段均有分布 */
  private mockStatusByAge(dayOffset: number): number {
    const r = Math.random();
    if (dayOffset >= 7) return r < 0.85 ? OrderStatus.COMPLETED : OrderStatus.CANCELLED; // 一周前：多数已完成，少量取消
    if (dayOffset >= 2) {                              // 2-6 天前：中后期阶段
      if (r < 0.5) return OrderStatus.COMPLETED;
      if (r < 0.7) return OrderStatus.PENDING_FINAL;
      if (r < 0.85) return OrderStatus.IN_SERVICE;
      if (r < 0.95) return OrderStatus.PENDING_DOOR;
      return OrderStatus.CANCELLED;
    }
    if (r < 0.3) return OrderStatus.COMPLETED;         // 最近 1-2 天：早期阶段为主
    if (r < 0.5) return OrderStatus.PENDING_FINAL;
    if (r < 0.7) return OrderStatus.IN_SERVICE;
    if (r < 0.9) return OrderStatus.PENDING_DOOR;
    return OrderStatus.PENDING_ACCEPT;
  }

  /** 按状态流转填充支付、接单、签到、完成、尾款及取消时间与关联人员 */
  private fillMockTimeline(
    order: Order,
    status: number,
    createdAt: Date,
    refs: { leaders: Employee[]; supervisors: Employee[] },
  ) {
    if (status >= OrderStatus.PENDING_ACCEPT) order.first_pay_time = new Date(createdAt.getTime() + 5 * 60000);
    if (status >= OrderStatus.PENDING_DOOR) {
      if (refs.leaders.length) order.leader_id = this.pick(refs.leaders).id;
      if (refs.supervisors.length) order.supervisor_id = this.pick(refs.supervisors).id;
      order.accept_time = new Date(createdAt.getTime() + 30 * 60000);
    }
    if (status >= OrderStatus.IN_SERVICE) order.sign_in_time = new Date(createdAt.getTime() + 2 * 3600000);
    if (status >= OrderStatus.PENDING_FINAL) {
      order.complete_time = new Date(createdAt.getTime() + 6 * 3600000);
      // 实际工时在计划工时上下浮动 ±1 小时，但不低于 0
      const actual = +order.plan_hours + (Math.random() * 2 - 1);
      order.actual_hours = Math.max(0, +actual.toFixed(1));
    }
    if (status >= OrderStatus.COMPLETED && order.complete_time) {
      order.final_pay_time = new Date(order.complete_time.getTime() + 30 * 60000);
    }
    if (status === OrderStatus.CANCELLED) {
      order.cancel_time = new Date(createdAt.getTime() + 60 * 60000);
      order.cancel_reason = '用户临时取消';
      order.refund_amount = order.first_payment;
    }
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private mockOrderNo(day: Date, seq: number): string {
    const ymd = `${day.getFullYear()}${(day.getMonth() + 1).toString().padStart(2, '0')}${day.getDate().toString().padStart(2, '0')}`;
    return `SJMOCK${ymd}${seq.toString().padStart(3, '0')}`;
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User as UE, UserAddress as UA, ServiceCategory as SC, ServiceItem as SI,
  Employee as EM, Material as MA, Coupon as CO, UserCoupon as UC, Order as OR,
  RoleMenuPermission as RMP,
} from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([UE, UA, SC, SI, EM, MA, CO, UC, OR, RMP])],
  providers: [SeedService],
})
export class SeedModule {}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ServiceCategory } from '../../entities/service-category.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { OperationLogHelper, OperatorInfo } from '../../common/utils/operation-log.helper';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServiceCategory) private catRepo: Repository<ServiceCategory>,
    @InjectRepository(ServiceItem) private itemRepo: Repository<ServiceItem>,
    private logHelper: OperationLogHelper,
  ) {}

  // ============ 品类 ============
  async listCategories(onlyOnSale = false) {
    // 默认过滤软删除；onlyOnSale 时追加上架过滤
    const where: FindOptionsWhere<ServiceCategory> = { is_deleted: 0 };
    if (onlyOnSale) where.status = 1;
    return this.catRepo.find({ where, order: { sort: 'ASC', id: 'ASC' } });
  }

  private trimStringFields<T extends Record<string, any>>(data: T, fields: string[]): T {
    const cleaned: Record<string, any> = { ...data };
    for (const f of fields) {
      if (typeof cleaned[f] === 'string') cleaned[f] = (cleaned[f] as string).trim();
    }
    return cleaned as T;
  }

  async createCategory(data: Partial<ServiceCategory>, operator?: OperatorInfo) {
    // 去除字符串字段左右空格（在唯一性校验之前执行）
    data = this.trimStringFields(data as any, ['name', 'icon', 'description']);
    // 名称唯一性校验（仅校验未删除记录，软删除后可新建同名）
    if (data.name) {
      const exist = await this.catRepo.findOne({ where: { name: data.name, is_deleted: 0 } });
      if (exist) throw new BadRequestException('品类名称已存在，请使用其他名称');
    }
    const cat = await this.catRepo.save(this.catRepo.create(data));
    // 写入操作日志
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_category',
      action: 'create',
      targetId: cat.id,
      content: JSON.stringify({ name: cat.name, icon: cat.icon, status: cat.status }),
    });
    return cat;
  }

  async updateCategory(id: number, data: Partial<ServiceCategory>, operator?: OperatorInfo) {
    // 去除字符串字段左右空格（在唯一性校验之前执行）
    data = this.trimStringFields(data as any, ['name', 'icon', 'description']);
    const before = await this.catRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!before) throw new NotFoundException('品类不存在');
    // 名称唯一性校验（仅校验未删除记录，排除自身 id）
    if (data.name && data.name !== before.name) {
      const exist = await this.catRepo.findOne({ where: { name: data.name, is_deleted: 0 } });
      if (exist && exist.id !== id) throw new BadRequestException('品类名称已存在，请使用其他名称');
    }
    await this.catRepo.update(id, data);
    const after = await this.catRepo.findOne({ where: { id, is_deleted: 0 } });
    // 写入操作日志，记录修改的字段
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_category',
      action: 'update',
      targetId: id,
      content: JSON.stringify({ before: { name: before.name, icon: before.icon, status: before.status }, after: { name: after?.name, icon: after?.icon, status: after?.status } }),
    });
    return after;
  }

  async toggleCategoryStatus(id: number, status: number, operator?: OperatorInfo) {
    // 使用 save 触发 @UpdateDateColumn，确保 updated_at 更新（列表按 updated_at 排序）
    const cat = await this.catRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!cat) throw new NotFoundException('品类不存在');
    const beforeStatus = cat.status;
    cat.status = status;
    await this.catRepo.save(cat);
    // 写入操作日志，记录前后状态
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_category',
      action: 'status_change',
      targetId: id,
      content: JSON.stringify({ before: beforeStatus, after: status }),
    });
    return { id, status };
  }

  async deleteCategory(id: number, operator?: OperatorInfo) {
    // 校验品类是否存在
    const cat = await this.catRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!cat) throw new NotFoundException('品类不存在');
    // 校验该品类下是否有未删除的服务（已软删除的不计入）
    const serviceCount = await this.itemRepo.count({ where: { category_id: id, is_deleted: 0 } });
    if (serviceCount > 0) {
      throw new BadRequestException('该品类下有服务，请先删除或迁移服务');
    }
    // 软删除：标记 is_deleted=1
    cat.is_deleted = 1;
    await this.catRepo.save(cat);
    // 写入操作日志
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_category',
      action: 'delete',
      targetId: id,
      content: JSON.stringify({ name: cat.name, icon: cat.icon }),
    });
    return { id, is_deleted: 1 };
  }

  // ============ 单品服务 ============
  async listItems(query: { category_id?: number; status?: number; keyword?: string; page?: number; pageSize?: number }) {
    const qb = this.itemRepo.createQueryBuilder('item');
    // 默认过滤软删除
    qb.andWhere('item.is_deleted = 0');
    if (query.category_id) qb.andWhere('item.category_id = :cid', { cid: query.category_id });
    if (query.status !== undefined) qb.andWhere('item.status = :s', { s: query.status });
    if (query.keyword) qb.andWhere('item.name LIKE :kw', { kw: `%${query.keyword}%` });
    // 固定按 updated_at 倒序，确保最新修改排在最前
    qb.orderBy('item.updated_at', 'DESC');
    const page = +query.page || 1;
    const pageSize = +query.pageSize || 20;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // 小程序端公开接口：按品类查上架服务列表（含品类名，精简字段）
  async publicListItems(categoryId: number) {
    const qb = this.itemRepo.createQueryBuilder('item');
    qb.leftJoin(ServiceCategory, 'cat', 'cat.id = item.category_id');
    qb.select([
      'item.id AS id',
      'item.name AS name',
      'item.thumbnail_image AS thumbnail_image',
      'item.cover_image AS cover_image',
      'item.price AS price',
      'item.promo_price AS promo_price',
      'item.category_id AS category_id',
      'cat.name AS category_name',
    ]);
    qb.andWhere('item.is_deleted = 0');
    qb.andWhere('item.status = 1');
    if (categoryId) qb.andWhere('item.category_id = :cid', { cid: categoryId });
    qb.orderBy('item.updated_at', 'DESC');
    return qb.getRawMany();
  }

  async getItem(id: number) {
    const item = await this.itemRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!item) throw new NotFoundException('服务不存在');
    return item;
  }

  // 小程序端公开详情：下架/删除返回特定提示
  async publicGetItem(id: number) {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item || item.is_deleted === 1) throw new NotFoundException('服务不存在或已删除');
    if (item.status === 0) throw new NotFoundException('该服务已下架');
    return item;
  }

  // 小程序端公开专区接口：按 display_zone 查上架服务列表
  async listByZone(zone: number) {
    return this.itemRepo.find({
      where: { display_zone: zone, status: 1, is_deleted: 0 },
      order: { updated_at: 'DESC' },
    });
  }

  async createItem(data: Partial<ServiceItem>, operator?: OperatorInfo) {
    // 去除字符串字段左右空格（在唯一性校验之前执行）
    data = this.trimStringFields(data as any, ['name', 'cover_image', 'thumbnail_image', 'banner_image', 'description', 'content', 'scope', 'notice']);
    // 走马灯大图校验：展示专区选「走马灯海报」(1) 时 banner_image 必填
    if (data.display_zone === 1 && !data.banner_image) {
      throw new BadRequestException('展示专区为走马灯海报时，必须上传走马灯大图');
    }
    // 标题唯一性校验（仅校验未删除记录，软删除后可新建同名）
    if (data.name) {
      const exist = await this.itemRepo.findOne({ where: { name: data.name, is_deleted: 0 } });
      if (exist) throw new BadRequestException('服务标题已存在，请使用其他标题');
    }
    const item = await this.itemRepo.save(this.itemRepo.create(data));
    // 写入操作日志
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_item',
      action: 'create',
      targetId: item.id,
      content: JSON.stringify({ name: item.name, category_id: item.category_id, price: item.price, promo_price: item.promo_price }),
    });
    return item;
  }

  async updateItem(id: number, data: Partial<ServiceItem>, operator?: OperatorInfo) {
    // 去除字符串字段左右空格（在唯一性校验之前执行）
    data = this.trimStringFields(data as any, ['name', 'cover_image', 'thumbnail_image', 'banner_image', 'description', 'content', 'scope', 'notice']);
    const before = await this.itemRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!before) throw new NotFoundException('服务不存在');
    // 走马灯大图校验：展示专区选「走马灯海报」(1) 时 banner_image 必填（合并已有值判断）
    const finalZone = data.display_zone != null ? data.display_zone : before.display_zone;
    const finalBanner = data.banner_image != null ? data.banner_image : before.banner_image;
    if (finalZone === 1 && !finalBanner) {
      throw new BadRequestException('展示专区为走马灯海报时，必须上传走马灯大图');
    }
    // 标题唯一性校验（仅校验未删除记录，排除自身 id）
    if (data.name && data.name !== before.name) {
      const exist = await this.itemRepo.findOne({ where: { name: data.name, is_deleted: 0 } });
      if (exist && exist.id !== id) throw new BadRequestException('服务标题已存在，请使用其他标题');
    }
    await this.itemRepo.update(id, data);
    const after = await this.itemRepo.findOne({ where: { id, is_deleted: 0 } });
    // 写入操作日志，记录关键字段变化
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_item',
      action: 'update',
      targetId: id,
      content: JSON.stringify({
        before: { name: before.name, price: before.price, promo_price: before.promo_price, status: before.status, display_zone: before.display_zone },
        after: { name: after?.name, price: after?.price, promo_price: after?.promo_price, status: after?.status, display_zone: after?.display_zone },
      }),
    });
    return after;
  }

  async toggleItemStatus(id: number, status: number, operator?: OperatorInfo) {
    // 使用 save 触发 @UpdateDateColumn，确保 updated_at 更新
    const item = await this.itemRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!item) throw new NotFoundException('服务不存在');
    const beforeStatus = item.status;
    item.status = status;
    await this.itemRepo.save(item);
    // 写入操作日志
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_item',
      action: 'status_change',
      targetId: id,
      content: JSON.stringify({ before: beforeStatus, after: status }),
    });
    return { id, status };
  }

  async deleteItem(id: number, operator?: OperatorInfo) {
    // 软删除：标记 is_deleted=1
    const item = await this.itemRepo.findOne({ where: { id, is_deleted: 0 } });
    if (!item) throw new NotFoundException('服务不存在');
    item.is_deleted = 1;
    await this.itemRepo.save(item);
    // 写入操作日志
    await this.logHelper.write({
      operator: operator || {},
      module: 'service_item',
      action: 'delete',
      targetId: id,
      content: JSON.stringify({ name: item.name, category_id: item.category_id }),
    });
    return { id, is_deleted: 1 };
  }

  async batchToggleStatus(ids: number[], status: number) {
    await this.itemRepo.update(ids, { status });
    return { ids, status };
  }
}

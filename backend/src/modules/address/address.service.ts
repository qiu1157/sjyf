import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from '../../entities/user-address.entity';

@Injectable()
export class AddressService {
  constructor(@InjectRepository(UserAddress) private repo: Repository<UserAddress>) {}

  private validatePayload(data: Partial<UserAddress>) {
    if (!data.contact_name || !data.contact_name.trim()) {
      throw new BadRequestException('请填写联系人姓名');
    }
    if (!data.contact_phone || !/^1\d{10}$/.test(data.contact_phone)) {
      throw new BadRequestException('联系电话格式不正确');
    }
    if (!data.province || !data.city || !data.district) {
      throw new BadRequestException('请完整选择省市区');
    }
    if (!data.detail || !data.detail.trim()) {
      throw new BadRequestException('请填写详细地址');
    }
  }

  private withFullAddress(item: UserAddress | null) {
    if (!item) return item;
    return {
      ...item,
      full_address: `${item.province || ''}${item.city || ''}${item.district || ''}${item.detail || ''}`.trim(),
    };
  }

  async list(userId: number) {
    const list = await this.repo.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', updated_at: 'DESC', id: 'DESC' },
    });
    return list.map((item) => this.withFullAddress(item));
  }

  async create(userId: number, data: Partial<UserAddress>) {
    this.validatePayload(data);
    const exists = await this.repo.count({ where: { user_id: userId } });
    const shouldDefault = data.is_default === 1 || exists === 0;
    if (shouldDefault) {
      await this.repo.update({ user_id: userId }, { is_default: 0 });
    }
    const saved = await this.repo.save(this.repo.create({
      ...data,
      user_id: userId,
      is_default: shouldDefault ? 1 : 0,
    }));
    return this.withFullAddress(saved);
  }

  async update(userId: number, id: number, data: Partial<UserAddress>) {
    const current = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!current) throw new NotFoundException('地址不存在');
    const next = { ...current, ...data };
    this.validatePayload(next);
    if (data.is_default === 1) {
      await this.repo.update({ user_id: userId }, { is_default: 0 });
    }
    await this.repo.update({ id, user_id: userId }, {
      ...data,
      is_default: data.is_default === 1 ? 1 : current.is_default,
    });
    const updated = await this.repo.findOne({ where: { id, user_id: userId } });
    return this.withFullAddress(updated);
  }

  async remove(userId: number, id: number) {
    const current = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!current) throw new NotFoundException('地址不存在');
    await this.repo.delete({ id, user_id: userId });
    if (current.is_default === 1) {
      const latest = await this.repo.findOne({
        where: { user_id: userId },
        order: { updated_at: 'DESC', id: 'DESC' },
      });
      if (latest) {
        await this.repo.update({ id: latest.id, user_id: userId }, { is_default: 1 });
      }
    }
    return { id };
  }

  async setDefault(userId: number, id: number) {
    const current = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!current) throw new NotFoundException('地址不存在');
    await this.repo.update({ user_id: userId }, { is_default: 0 });
    await this.repo.update({ id, user_id: userId }, { is_default: 1 });
    const updated = await this.repo.findOne({ where: { id, user_id: userId } });
    return this.withFullAddress(updated);
  }
}

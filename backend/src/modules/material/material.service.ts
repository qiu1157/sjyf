import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../entities/material.entity';

@Injectable()
export class MaterialService {
  constructor(@InjectRepository(Material) private repo: Repository<Material>) {}

  async list(q: { keyword?: string; status?: number; page?: number; pageSize?: number }) {
    const qb = this.repo.createQueryBuilder('m');
    if (q.keyword) qb.andWhere('m.name LIKE :kw', { kw: `%${q.keyword}%` });
    if (q.status !== undefined) qb.andWhere('m.status = :s', { s: q.status });
    qb.orderBy('m.id', 'DESC');
    const page = +q.page || 1;
    const pageSize = +q.pageSize || 50;
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async create(data: Partial<Material>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Material>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async toggle(id: number, status: number) {
    await this.repo.update(id, { status });
    return { id, status };
  }
}

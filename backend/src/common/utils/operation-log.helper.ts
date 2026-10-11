import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '../../entities/operation-log.entity';

// 操作人信息（从 JWT payload 提取）
export interface OperatorInfo {
  id?: number;       // JWT sub 字段
  role?: number;     // JWT role 字段
  name?: string;     // JWT name 字段
}

// 写入日志的参数
export interface WriteLogParams {
  operator: OperatorInfo;
  module: string;       // 模块名，如 service_category / service_item
  action: string;       // 动作，如 create / update / status_change / delete
  targetId?: number;   // 操作目标 ID
  content?: string;     // 操作内容描述（JSON 字符串或文本）
}

@Injectable()
export class OperationLogHelper {
  private readonly logger = new Logger(OperationLogHelper.name);

  constructor(
    @InjectRepository(OperationLog) private logRepo: Repository<OperationLog>,
  ) {}

  // 写入操作日志；失败仅记录错误日志，不影响主业务流程
  async write(params: WriteLogParams): Promise<void> {
    try {
      const { operator, module, action, targetId, content } = params;
      await this.logRepo.save(
        this.logRepo.create({
          operator_id: operator.id,
          operator_role: operator.role,
          operator_name: operator.name,
          module,
          action,
          target_id: targetId,
          content,
        }),
      );
    } catch (err) {
      // 日志写入失败不阻塞业务，仅记录错误
      this.logger.error(`操作日志写入失败: ${err?.message || err}`, err?.stack);
    }
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { ServiceCategory } from '../../entities/service-category.entity';
import { ServiceItem } from '../../entities/service-item.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { OperationLogHelper } from '../../common/utils/operation-log.helper';

@Module({
  // 注册 ServiceCategory / ServiceItem / OperationLog 三个实体
  imports: [TypeOrmModule.forFeature([ServiceCategory, ServiceItem, OperationLog])],
  controllers: [ServiceController],
  // ServiceService 处理业务，OperationLogHelper 写入日志
  providers: [ServiceService, OperationLogHelper],
  exports: [ServiceService],
})
export class ServiceModule {}

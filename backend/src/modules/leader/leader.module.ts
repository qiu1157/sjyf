import { BadRequestException, Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../entities/employee.entity';
import { Order } from '../../entities/order.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderStatus } from '../../common/constants/order-status.constants';

@ApiTags('领队信息')
@Controller('leader')
export class LeaderController {
  constructor(
    @InjectRepository(Employee) private empRepo: Repository<Employee>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  @Roles(4)
  @Get('profile')
  async profile(
    @CurrentUser('leaderEmployeeId') leaderEmployeeId: number,
    @CurrentUser('sub') userId?: number,
  ) {
    const employeeId = leaderEmployeeId || userId;
    if (!employeeId) {
      throw new BadRequestException('领队身份无效');
    }

    const emp = await this.empRepo.findOne({ where: { id: employeeId } });
    if (emp) delete emp.password;
    const now = new Date();
    const todayText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayList = await this.orderRepo.find({ where: { leader_id: employeeId } });
    const today = todayList.filter(o => o.book_date === todayText);
    return {
      employee: emp,
      todayCount: today.length,
      pendingArrive: todayList.filter(o => o.status === OrderStatus.PENDING_DOOR).length,
      inService: todayList.filter(o => o.status === OrderStatus.IN_SERVICE).length,
      pendingFinal: todayList.filter(o => o.status === OrderStatus.PENDING_FINAL).length,
    };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Order])],
  controllers: [LeaderController],
})
export class LeaderModule {}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';

@ApiTags('数据看板')
@Controller('admin')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  // 数据看板：系统管理员与主管可访问，@Menu 做菜单级鉴权
  @Roles(1, 2, 3)
  @Menu('dashboard')
  @Get('dashboard/summary')
  summary() { return this.svc.summary(); }

  @Roles(1, 2, 3)
  @Menu('dashboard')
  @Get('dashboard/order-trend')
  trend(@Query('days') days: string) { return this.svc.orderTrend(+days || 7); }

  @Roles(1, 2, 3)
  @Menu('dashboard')
  @Get('dashboard/todo-list')
  todo() { return this.svc.todoList(); }

  @Roles(1, 2, 3)
  @Menu('dashboard')
  @Get('dashboard/hours-analysis')
  hours() { return this.svc.hoursAnalysis(); }

  // 账务管理：系统管理员与主管可访问，@Menu 做菜单级鉴权
  @Roles(1, 3)
  @Menu('finance')
  @Get('finance/overview')
  financeOverview(@Query() q: any) { return this.svc.financeOverview(q.start_date, q.end_date); }

  @Roles(1, 3)
  @Menu('finance')
  @Get('finance/orders')
  financeOrders(@Query() q: any) { return this.svc.financeOrders(q); }
}

import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';

@ApiTags('员工管理')
@Controller('admin/employees')
export class EmployeeController {
  constructor(private svc: EmployeeService) {}

  // 员工管理：系统管理员与主管可访问，@Menu 做菜单级鉴权
  @Roles(1, 3)
  @Menu('employees')
  @Get()
  list(@Query() q: any) { return this.svc.list(q); }

  @Roles(1, 3)
  @Menu('employees')
  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Roles(1, 3)
  @Menu('employees')
  @Put(':id')
  update(@Param('id') id: number, @Body() body: any) { return this.svc.update(+id, body); }

  @Roles(1, 3)
  @Menu('employees')
  @Put(':id/status')
  toggle(@Param('id') id: number, @Body() body: { status: number }) {
    return this.svc.toggle(+id, body.status);
  }
}

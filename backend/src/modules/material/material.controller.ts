import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MaterialService } from './material.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Menu } from '../../common/decorators/menu.decorator';

@ApiTags('物料管理')
@Controller()
export class MaterialController {
  constructor(private svc: MaterialService) {}

  // 物料管理：系统管理员与主管可访问，@Menu 做菜单级鉴权
  @Roles(1, 3)
  @Menu('materials')
  @Get('admin/materials')
  list(@Query() q: any) { return this.svc.list(q); }

  @Roles(1, 3)
  @Menu('materials')
  @Post('admin/materials')
  create(@Body() body: any) { return this.svc.create(body); }

  @Roles(1, 3)
  @Menu('materials')
  @Put('admin/materials/:id')
  update(@Param('id') id: number, @Body() body: any) { return this.svc.update(+id, body); }

  @Roles(1, 3)
  @Menu('materials')
  @Put('admin/materials/:id/status')
  toggle(@Param('id') id: number, @Body() body: { status: number }) {
    return this.svc.toggle(+id, body.status);
  }

  @Roles(4)
  @Get('leader/materials')
  async leaderList() {
    const result = await this.svc.list({ status: 1, pageSize: 999 });
    return result.list.filter((item: any) => item.status === 1);
  }
}

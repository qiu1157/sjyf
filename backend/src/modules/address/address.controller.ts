import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('地址管理')
@Controller('addresses')
export class AddressController {
  constructor(private svc: AddressService) {}

  @Get()
  list(@CurrentUser('sub') uid: number) { return this.svc.list(uid); }

  @Post()
  create(@CurrentUser('sub') uid: number, @Body() body: any) { return this.svc.create(uid, body); }

  @Put(':id')
  update(@CurrentUser('sub') uid: number, @Param('id') id: number, @Body() body: any) {
    return this.svc.update(uid, +id, body);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') uid: number, @Param('id') id: number) {
    return this.svc.remove(uid, +id);
  }

  @Post(':id/default')
  setDefault(@CurrentUser('sub') uid: number, @Param('id') id: number) {
    return this.svc.setDefault(uid, +id);
  }
}

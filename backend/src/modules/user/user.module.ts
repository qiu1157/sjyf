import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('用户信息')
@Controller('user')
export class UserController {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  @Get('profile')
  async profile(@CurrentUser('sub') uid: number) {
    return this.repo.findOne({ where: { id: uid } });
  }

  @Put('profile')
  async update(@CurrentUser('sub') uid: number, @Body() body: any) {
    await this.repo.update(uid, body);
    return this.repo.findOne({ where: { id: uid } });
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
})
export class UserModule {}

import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('评价')
@Controller('reviews')
export class ReviewController {
  constructor(private svc: ReviewService) {}

  @Post()
  submit(@CurrentUser('sub') uid: number, @Body() body: any) {
    return this.svc.submit(uid, body);
  }

  @Get(':orderId')
  get(@Param('orderId') oid: number) {
    return this.svc.getByOrder(+oid);
  }
}

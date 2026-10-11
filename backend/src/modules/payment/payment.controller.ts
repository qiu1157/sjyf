import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('支付模块')
@Controller('payment')
export class PaymentController {
  constructor(private svc: PaymentService) {}

  @Public()
  @Get('mode')
  mode() { return { mode: this.svc.payMode }; }

  @Post('first')
  payFirst(@Body() body: { orderId: number }) {
    return this.svc.payFirst(body.orderId);
  }

  @Post('final')
  payFinal(@CurrentUser('sub') userId: number, @Body() body: { orderId: number }) {
    return this.svc.payFinalByUser(userId, body.orderId);
  }

  @Post('mock-pay')
  mock(@Body() body: { orderId: number; payType: 'first' | 'final'; success?: boolean }) {
    return this.svc.mockPay(body.orderId, body.payType, body.success !== false);
  }
}

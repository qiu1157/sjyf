import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review } from '../../entities/review.entity';
import { Order } from '../../entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Order])],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}

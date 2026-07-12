import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { PremiumPlanGuard } from './guards/premium-plan.guard';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { UserPlanService } from './user-plan.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, UserSubscription])],
  controllers: [SubscriptionsController],
  providers: [UserPlanService, SubscriptionsService, PremiumPlanGuard],
  exports: [UserPlanService, PremiumPlanGuard],
})
export class SubscriptionsModule {}

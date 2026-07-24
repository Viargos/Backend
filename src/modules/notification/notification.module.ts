import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationDeliveryAttempt } from './entities/notification-delivery-attempt.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { Notification } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscriptionCryptoService } from './subscription-crypto.service';

@Global()
@Module({
  controllers: [NotificationController],
  exports: [NotificationService],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Notification,
      NotificationDeliveryAttempt,
      NotificationPreference,
      PushSubscription,
    ]),
  ],
  providers: [NotificationService, SubscriptionCryptoService],
})
export class NotificationModule {}

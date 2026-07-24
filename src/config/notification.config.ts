import { registerAs } from '@nestjs/config';

export const NotificationConfigName = 'notifications';

export type NotificationConfig = {
  subscriptionEncryptionKey?: string;
  vapidPrivateKey?: string;
  vapidPublicKey?: string;
  vapidSubject: string;
};

export default registerAs(
  NotificationConfigName,
  (): NotificationConfig => ({
    subscriptionEncryptionKey:
      process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidSubject:
      process.env.VAPID_SUBJECT || 'mailto:notifications@viargos.com',
  }),
);

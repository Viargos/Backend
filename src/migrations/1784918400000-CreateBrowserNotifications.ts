import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBrowserNotifications1784918400000
  implements MigrationInterface
{
  name = 'CreateBrowserNotifications1784918400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "user_id" uuid NOT NULL,
        "browser_enabled" boolean NOT NULL DEFAULT false,
        "reminders_enabled" boolean NOT NULL DEFAULT true,
        "task_workflow_enabled" boolean NOT NULL DEFAULT true,
        "success_enabled" boolean NOT NULL DEFAULT true,
        "errors_warnings_enabled" boolean NOT NULL DEFAULT true,
        "messages_activity_enabled" boolean NOT NULL DEFAULT true,
        "account_security_enabled" boolean NOT NULL DEFAULT true,
        "product_system_enabled" boolean NOT NULL DEFAULT false,
        "immediate_enabled" boolean NOT NULL DEFAULT true,
        "grouping_enabled" boolean NOT NULL DEFAULT true,
        "quiet_hours_enabled" boolean NOT NULL DEFAULT false,
        "quiet_hours_start" time without time zone NOT NULL DEFAULT '22:00',
        "quiet_hours_end" time without time zone NOT NULL DEFAULT '07:00',
        "timezone" varchar(80) NOT NULL DEFAULT 'UTC',
        "sound_enabled" boolean NOT NULL DEFAULT true,
        "detailed_preview_enabled" boolean NOT NULL DEFAULT false,
        "suppress_duplicates_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_notification_preferences_user"
          FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "event_type" varchar(64) NOT NULL,
        "category" varchar(32) NOT NULL,
        "title" varchar(160) NOT NULL,
        "message" text NOT NULL,
        "destination_url" varchar(2048) NOT NULL DEFAULT '/notifications',
        "actions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "metadata" jsonb,
        "critical" boolean NOT NULL DEFAULT false,
        "silent" boolean NOT NULL DEFAULT false,
        "dedupe_key" varchar(180),
        "scheduled_at" TIMESTAMP WITH TIME ZONE,
        "delivered_at" TIMESTAMP WITH TIME ZONE,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "dismissed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user"
          FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("user_id", "read_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_scheduled_delivery" ON "notifications" ("scheduled_at", "delivered_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_id" uuid NOT NULL,
        "endpoint_hash" varchar(64) NOT NULL,
        "endpoint_encrypted" text NOT NULL,
        "p256dh_encrypted" text NOT NULL,
        "auth_encrypted" text NOT NULL,
        "permission" varchar(16) NOT NULL DEFAULT 'granted',
        "user_agent" varchar(512),
        "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "failure_count" integer NOT NULL DEFAULT 0,
        "last_failure_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_push_subscriptions_endpoint_hash" UNIQUE ("endpoint_hash"),
        CONSTRAINT "UQ_push_subscription_user_device" UNIQUE ("user_id", "device_id"),
        CONSTRAINT "FK_push_subscriptions_user"
          FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_push_subscriptions_active_user" ON "push_subscriptions" ("user_id", "revoked_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "notification_delivery_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "notification_id" uuid NOT NULL,
        "subscription_id" uuid NOT NULL,
        "attempt" integer NOT NULL,
        "status" varchar(16) NOT NULL,
        "status_code" integer,
        "error_code" varchar(80),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_delivery_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_delivery_attempt_notification"
          FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_delivery_attempt_subscription"
          FOREIGN KEY ("subscription_id") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_delivery_attempts_notification" ON "notification_delivery_attempts" ("notification_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_delivery_attempts"`);
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
  }
}

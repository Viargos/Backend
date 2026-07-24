import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import {
  RegisterPushSubscriptionDto,
  RevokePushSubscriptionDto,
  ScheduleReminderDto,
  UpdateNotificationPreferencesDto,
} from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the current user notifications' })
  async list(
    @CurrentUser() user: User,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return {
      data: await this.notificationService.listNotifications(
        user.id,
        limit,
        offset,
      ),
    };
  }

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get browser push availability and public key' })
  getBrowserConfiguration() {
    return {
      data: this.notificationService.getBrowserConfiguration(),
    };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser() user: User) {
    return {
      data: await this.notificationService.getPreferences(user.id),
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() input: UpdateNotificationPreferencesDto,
  ) {
    return {
      data: await this.notificationService.updatePreferences(
        user.id,
        input,
      ),
    };
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Register or refresh a browser push subscription' })
  async registerSubscription(
    @CurrentUser() user: User,
    @Body() input: RegisterPushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return {
      data: await this.notificationService.registerSubscription(
        user.id,
        input,
        userAgent,
      ),
    };
  }

  @Post('subscriptions/revoke')
  @ApiOperation({ summary: 'Revoke the current browser subscription' })
  async revokeSubscription(
    @CurrentUser() user: User,
    @Body() input: RevokePushSubscriptionDto,
  ) {
    return {
      data: await this.notificationService.revokeSubscription(
        user.id,
        input.deviceId,
      ),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: User) {
    return {
      data: await this.notificationService.getUnreadCount(user.id),
    };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark every notification as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    return {
      data: await this.notificationService.markAllAsRead(user.id),
    };
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear every notification' })
  async clear(@CurrentUser() user: User) {
    return {
      data: await this.notificationService.clearNotifications(user.id),
    };
  }

  @Post('reminders')
  @ApiOperation({ summary: 'Schedule a notification reminder' })
  async scheduleReminder(
    @CurrentUser() user: User,
    @Body() input: ScheduleReminderDto,
  ) {
    return {
      data: await this.notificationService.scheduleReminder(user.id, input),
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    return {
      data: await this.notificationService.markAsRead(
        user.id,
        notificationId,
      ),
    };
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Track browser notification dismissal' })
  async markDismissed(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    return {
      data: await this.notificationService.markDismissed(
        user.id,
        notificationId,
      ),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async delete(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    return {
      data: await this.notificationService.deleteNotification(
        user.id,
        notificationId,
      ),
    };
  }
}

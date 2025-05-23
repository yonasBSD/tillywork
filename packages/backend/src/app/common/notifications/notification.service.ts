import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { Queue } from "bull";
import { InjectQueue } from "@nestjs/bull";

import { CreateNotificationDto } from "./dto/create.notification.dto";
import { Notification } from "./notification.entity";
import { NotificationType } from "@tillywork/shared";
import { NotificationEvent } from "./events/notification.event";
import { NotificationsGateway } from "./notification.gateway";
import { NotificationPreferenceService } from "./notification-preference/notification.preference.service";
import { SlackIntegrationService } from "../user-integrations/services/slack.integration.service";

export class NotificationService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        @InjectQueue("notifications") private notificationQueue: Queue,
        private notificationGateway: NotificationsGateway,
        private notificationPreferenceService: NotificationPreferenceService,
        private slackIntegrationService: SlackIntegrationService
    ) {}

    async create(data: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationRepository.create({
            ...data,
            recipient: {
                id: data.recipientId,
            },
            workspace: {
                id: data.workspaceId,
            },
            isRead: data.isRead ?? false,
        });

        await this.notificationRepository.save(notification);

        this.notificationGateway.sendNotificationToUser(
            notification.recipient.id,
            notification
        );

        return notification;
    }

    async addToQueue(
        notificationType: NotificationType,
        event: NotificationEvent
    ): Promise<void> {
        await this.notificationQueue.add(
            "notify",
            {
                type: notificationType,
                event,
            },
            { delay: 1000 }
        );
    }

    async findAll({
        userId,
        workspaceId,
        isRead,
    }: {
        userId: number;
        workspaceId: number;
        isRead?: boolean;
    }): Promise<Notification[]> {
        const query = this.notificationRepository
            .createQueryBuilder("notification")
            .where("notification.recipientId = :userId", { userId })
            .andWhere("notification.workspaceId = :workspaceId", {
                workspaceId,
            })
            .orderBy("notification.createdAt", "DESC");

        if (isRead !== undefined) {
            query.andWhere("notification.isRead = :isRead", {
                isRead,
            });
        }

        return query.getMany();
    }

    async update(
        notificationId: string,
        updateData: Partial<Pick<Notification, "isRead" | "message">>
    ): Promise<Notification | null> {
        const notification = await this.notificationRepository.findOneBy({
            id: notificationId,
        });

        if (!notification) {
            return null;
        }

        this.notificationRepository.merge(notification, updateData);
        return this.notificationRepository.save(notification);
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationRepository
            .createQueryBuilder()
            .update(Notification)
            .set({ isRead: true })
            .where("recipientId = :userId", { userId })
            .andWhere("isRead = false")
            .execute();
    }

    async delete(notificationId: string): Promise<boolean> {
        const result = await this.notificationRepository.delete(notificationId);
        return result.affected !== undefined && result.affected > 0;
    }

    async sendUserNotification({
        type,
        recipientId,
        workspaceId,
        relatedResourceId,
        relatedResourceType,
        message,
        title,
        color,
        url,
    }: {
        type: NotificationType;
        recipientId: number;
        workspaceId: number;
        relatedResourceId: string;
        relatedResourceType: string;
        message: string;
        title: string;
        color?: string;
        url?: string;
    }) {
        if (
            await this.notificationPreferenceService.isInAppEnabled(recipientId)
        ) {
            await this.create({
                type,
                recipientId,
                workspaceId,
                relatedResourceId,
                relatedResourceType,
                message,
                color,
            });
        }

        const slackConfig =
            await this.notificationPreferenceService.isSlackEnabled(
                recipientId
            );

        if (slackConfig.isDmEnabled) {
            await this.slackIntegrationService.sendDM({
                userId: recipientId,
                message,
                title,
                url,
            });
        }
    }
}

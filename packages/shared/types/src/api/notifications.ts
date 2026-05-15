import type { INotification } from "../index.js";

export interface NotificationIdParams {
  id: string;
}

export type ListNotificationsResponse = INotification[];

export type MarkNotificationReadResponse = INotification;

export interface MarkAllNotificationsReadResponse {
  ok: boolean;
}

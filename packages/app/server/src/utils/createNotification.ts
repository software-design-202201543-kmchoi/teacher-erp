import type { INotification } from "@teacher-erp/shared-types"
import { demoNotifications, demoNotificationsByUserId } from "@teacher-erp/shared-utils"

export function createNotification(
  userId: string,
  title: string,
  content: string
): INotification {
  const now = new Date()
  const notif: INotification = {
    _id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: userId,
    title,
    content,
    is_read: false,
    createdAt: now,
    updatedAt: now,
  }
  demoNotifications.push(notif)
  if (!demoNotificationsByUserId[userId]) demoNotificationsByUserId[userId] = []
  demoNotificationsByUserId[userId].push(notif)
  return notif
}

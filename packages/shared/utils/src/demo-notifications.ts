import type { INotification } from "@teacher-erp/shared-types"

export const demoNotifications: INotification[] = [
  {
    _id: "notif-1",
    user_id: "student-1",
    title: "새 성적 등록",
    content: "국어 성적이 등록되었습니다. 85점",
    is_read: false,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
  },
  {
    _id: "notif-2",
    user_id: "student-1",
    title: "피드백 공개",
    content: "새로운 피드백이 작성되었습니다.",
    is_read: true,
    createdAt: new Date("2026-04-05"),
    updatedAt: new Date("2026-04-05"),
  },
  {
    _id: "notif-3",
    user_id: "parent-1",
    title: "자녀 성적 업데이트",
    content: "이한결 학생의 수학 성적이 등록되었습니다.",
    is_read: false,
    createdAt: new Date("2026-04-02"),
    updatedAt: new Date("2026-04-02"),
  },
]

export const demoNotificationsByUserId: Record<string, INotification[]> = {}
for (const n of demoNotifications) {
  if (!demoNotificationsByUserId[n.user_id]) demoNotificationsByUserId[n.user_id] = []
  demoNotificationsByUserId[n.user_id].push(n)
}

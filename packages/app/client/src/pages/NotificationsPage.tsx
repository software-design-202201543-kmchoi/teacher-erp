import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { INotification } from "@teacher-erp/shared-types"

export function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  })

  const { mutate: readOne } = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const { mutate: readAll } = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotificationClick = (notif: INotification) => {
    if (!notif.is_read) {
      readOne(notif._id)
    }
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">알림</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              읽지 않은 알림 {unreadCount}개
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAll()}>
            전체 읽음
          </Button>
        )}
      </section>

      {isLoading && (
        <p className="text-sm text-muted-foreground">알림을 불러오는 중입니다...</p>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">알림이 없습니다.</p>
        </div>
      )}

      {!isLoading && notifications.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notifications.map((notif) => (
            <li
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-accent ${
                !notif.is_read ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800" : "bg-card"
              }`}
            >
              <div className="mt-1.5 flex-shrink-0">
                {!notif.is_read ? (
                  <span className="block h-2 w-2 rounded-full bg-blue-500" />
                ) : (
                  <span className="block h-2 w-2 rounded-full bg-transparent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                    {notif.title}
                  </p>
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notif.content}</p>
                {!notif.is_read && (
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    미읽음
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

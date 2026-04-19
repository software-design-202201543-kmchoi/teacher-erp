import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { getNotifications } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function NotificationBell() {
  const navigate = useNavigate()

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const badgeCount = Math.min(unreadCount, 99)

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative"
      aria-label={`알림 ${unreadCount > 0 ? `(${badgeCount}개 미읽음)` : ""}`}
      onClick={() => void navigate("/notifications")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold leading-none text-white">
          {badgeCount}
        </span>
      )}
    </Button>
  )
}

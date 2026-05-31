import { NavLink, useNavigate, Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getNotifications } from "@/lib/api"
import type { IParentUser, IStudentUser } from "@teacher-erp/shared-types"
import {
  Home,
  Users,
  BarChart2,
  MessageSquare,
  ClipboardList,
  Bell,
  LogOut,
  type LucideIcon,
} from "lucide-react"

const APP_NAME = "학생 관리 시스템"

type NavItem = { label: string; to: string; Icon: LucideIcon }

const teacherNav: NavItem[] = [
  { label: "대시보드", to: "/", Icon: Home },
  { label: "학생 목록", to: "/students", Icon: Users },
]

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: Boolean(user),
    refetchInterval: 60_000,
  })
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const navItems = useMemo<NavItem[]>(() => {
    if (!user) return []
    if (user.role === "TEACHER") return teacherNav
    if (user.role === "STUDENT") {
      const studentId = (user as IStudentUser)._id
      return [
        { label: "대시보드", to: "/", Icon: Home },
        { label: "성적", to: `/students/${studentId}/grades`, Icon: BarChart2 },
        { label: "피드백", to: `/students/${studentId}/feedback`, Icon: MessageSquare },
      ]
    }
    // PARENT
    const childIds = (user as IParentUser).children
    const items: NavItem[] = [{ label: "대시보드", to: "/", Icon: Home }]
    childIds.forEach((childId, i) => {
      const suffix = childIds.length > 1 ? ` ${i + 1}` : ""
      items.push(
        { label: `자녀 학생부${suffix}`, to: `/students/${childId}`, Icon: ClipboardList },
        { label: `자녀 성적${suffix}`, to: `/students/${childId}/grades`, Icon: BarChart2 },
        { label: `자녀 피드백${suffix}`, to: `/students/${childId}/feedback`, Icon: MessageSquare },
      )
    })
    return items
  }, [user])

  if (!user) {
    void navigate("/login", { replace: true })
    return null
  }

  const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-md ${
      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
    }`

  return (
    <div className="flex min-h-svh">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-card">
        <div className="border-b px-4 py-4">
          <span className="font-semibold text-sm">{APP_NAME}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{user.name}</p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={sidebarLinkClass}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 알림 + 로그아웃 — 사이드바 하단 고정 */}
        <div className="border-t p-2 space-y-1">
          <Link
            to="/notifications"
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <Bell size={16} />
              <span>알림</span>
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground leading-none">
                {unreadCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 본문 영역 */}
      <div className="flex flex-1 flex-col">
        {/* 모바일 상단 헤더 */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <span className="font-semibold text-sm">{APP_NAME}</span>
          <Link to="/notifications" className="relative p-1 text-muted-foreground">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Link>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* 모바일 하단 탭바 */}
        <nav className="flex border-t bg-card md:hidden">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          {/* 알림 탭 — 탭바 끝 고정 */}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <span className="relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </span>
            <span>알림</span>
          </NavLink>
        </nav>
      </div>
    </div>
  )
}

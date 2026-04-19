import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import type { ReactNode } from "react"

type NavItem = { label: string; to: string; icon: string }

const teacherNav: NavItem[] = [
  { label: "대시보드", to: "/", icon: "🏠" },
  { label: "학생 목록", to: "/students", icon: "👥" },
  { label: "알림", to: "/notifications", icon: "🔔" },
]

const studentNav: NavItem[] = [
  { label: "대시보드", to: "/", icon: "🏠" },
  { label: "알림", to: "/notifications", icon: "🔔" },
]

const parentNav: NavItem[] = [
  { label: "대시보드", to: "/", icon: "🏠" },
  { label: "알림", to: "/notifications", icon: "🔔" },
]

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    void navigate("/login", { replace: true })
    return null
  }

  const navItems =
    user.role === "TEACHER" ? teacherNav
    : user.role === "STUDENT" ? studentNav
    : parentNav

  const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 text-sm transition-colors rounded-md ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted"
    }`

  return (
    <div className="flex min-h-svh">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:bg-card">
        <div className="border-b px-4 py-4">
          <span className="font-semibold text-sm">Teacher ERP</span>
          <p className="text-xs text-muted-foreground mt-0.5">{user.name}</p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={sidebarLinkClass}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-2">
          <button
            onClick={() => void logout()}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 본문 영역 */}
      <div className="flex flex-1 flex-col">
        {/* 모바일 상단 헤더 */}
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <span className="font-semibold text-sm">Teacher ERP</span>
          <span className="text-xs text-muted-foreground">{user.name}</span>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* 모바일 하단 탭바 */}
        <nav className="flex border-t bg-card md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center py-2 text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

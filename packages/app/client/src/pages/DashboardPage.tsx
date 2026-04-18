import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

export function DashboardPage() {
  const { user, ability, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Teacher ERP · 로그인/권한관리</p>
        <h1 className="mt-2 text-2xl font-semibold">인증 세션 대시보드</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          로그인된 역할 기준으로 React 화면 접근과 Express API 접근이 모두 제한됩니다.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">현재 세션</h2>
        <p className="mt-2 text-sm text-muted-foreground">ID: {user._id}</p>
        <p className="text-sm text-muted-foreground">Role: {user.role}</p>
        <p className="text-sm text-muted-foreground">Email: {user.email}</p>
        <div className="mt-4 flex gap-3">
          {user.role === "TEACHER" && (
            <Button asChild variant="default">
              <Link to="/students">학생 목록 보기</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </section>
    </main>
  )
}
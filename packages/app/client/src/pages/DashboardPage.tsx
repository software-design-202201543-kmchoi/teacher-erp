import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { apiRequest } from "@/lib/api"
import { useState } from "react"

export function DashboardPage() {
  const { user, ability, logout } = useAuth()
  const [apiResult, setApiResult] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  if (!user) {
    return null
  }

  async function testProtectedApi(path: string) {
    setApiResult(null)
    setApiError(null)
    try {
      const data = await apiRequest<unknown>(path)
      setApiResult(JSON.stringify(data, null, 2))
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">SD2-29 · SD2-30~32 · SD2-37 · SD2-38</p>
        <h1 className="mt-2 text-2xl font-semibold">인증/권한 대시보드</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          로그인된 역할 기준으로 React 화면 접근과 Express API 접근이 모두 제한됩니다.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">현재 세션</h2>
        <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div><span className="font-medium text-foreground">ID:</span> {user._id}</div>
          <div><span className="font-medium text-foreground">역할:</span> {user.role}</div>
          <div><span className="font-medium text-foreground">이메일:</span> {user.email}</div>
          <div><span className="font-medium text-foreground">이름:</span> {user.name}</div>
        </dl>
        <div className="mt-4">
          <Button variant="outline" onClick={() => void logout()}>
            로그아웃
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">역할별 액션 (SD2-38 · 권한 기반 버튼 제어)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          현재 역할({user.role})에서 허용된 액션만 표시됩니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {ability.can("manage", "Grade") && (
            <Button variant="secondary" size="sm">성적 입력/수정 (교사 전용)</Button>
          )}
          {ability.can("read", "Grade") && (
            <Button variant="secondary" size="sm">성적 조회</Button>
          )}
          {ability.can("manage", "Counseling") && (
            <Button variant="secondary" size="sm">상담 기록 관리 (교사 전용)</Button>
          )}
          {ability.can("manage", "Feedback") && (
            <Button variant="secondary" size="sm">피드백 작성 (교사 전용)</Button>
          )}
          {ability.can("read", "Feedback") && (
            <Button variant="secondary" size="sm">피드백 조회</Button>
          )}
          {ability.can("read", "Student") && (
            <Button variant="secondary" size="sm">학생 목록 조회</Button>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">API 보호 검증 (SD2-37 · authorize 미들웨어)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          서버의 <code className="font-mono text-xs bg-muted px-1 rounded">authorize</code> 미들웨어가 역할을 검증합니다. 권한 없는 요청에는 403을 반환합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" onClick={() => void testProtectedApi("/api/auth/me")}>
            GET /api/auth/me (인증 필요)
          </Button>
          <Button size="sm" variant="outline" onClick={() => void testProtectedApi("/api/grades")}>
            GET /api/grades (교사만 관리)
          </Button>
          <Button size="sm" variant="outline" onClick={() => void testProtectedApi("/api/counseling")}>
            GET /api/counseling (교사만 관리)
          </Button>
        </div>
        {apiResult && (
          <pre className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-xs">{apiResult}</pre>
        )}
        {apiError && (
          <p className="mt-4 text-sm text-destructive">{apiError}</p>
        )}
      </section>
    </main>
  )
}

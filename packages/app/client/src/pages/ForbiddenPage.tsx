import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"

interface LocationState {
  from?: string
}

export function ForbiddenPage() {
  const location = useLocation()
  const state = location.state as LocationState | null

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col items-start justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">403 Forbidden</p>
      <h1 className="text-3xl font-semibold">접근 권한이 없습니다.</h1>
      <p className="text-sm text-muted-foreground">
        요청한 경로: {state?.from ?? "알 수 없음"}
      </p>
      <Button asChild>
        <Link to="/">대시보드로 돌아가기</Link>
      </Button>
    </main>
  )
}
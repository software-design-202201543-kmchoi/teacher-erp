import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { getCounseling, createCounseling } from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { ICounselingRecord } from "@teacher-erp/shared-types"

export function CounselingPage() {
  const { id: studentId = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [filterKeyword, setFilterKeyword] = useState("")
  const [activeFilter, setActiveFilter] = useState<{ from?: string; to?: string; keyword?: string }>({})

  const [formDate, setFormDate] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formNextPlan, setFormNextPlan] = useState("")
  const [formShared, setFormShared] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: records = [], isLoading, error } = useQuery({
    queryKey: ["counseling", studentId, activeFilter],
    queryFn: () => getCounseling(studentId, activeFilter),
    enabled: !!studentId,
  })

  const createMutation = useMutation({
    mutationFn: (data: { counsel_date: string; content: string; next_plan?: string; is_shared: boolean }) =>
      createCounseling(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counseling", studentId] })
      setFormDate("")
      setFormContent("")
      setFormNextPlan("")
      setFormShared(false)
      setFormError(null)
    },
    onError: () => setFormError("상담 기록 저장 중 오류가 발생했습니다."),
  })

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setActiveFilter({
      from: filterFrom || undefined,
      to: filterTo || undefined,
      keyword: filterKeyword || undefined,
    })
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formDate || !formContent.trim()) {
      setFormError("날짜와 내용을 입력하세요.")
      return
    }
    createMutation.mutate({
      counsel_date: formDate,
      content: formContent,
      next_plan: formNextPlan || undefined,
      is_shared: formShared,
    })
  }

  if (user?.role !== "TEACHER") {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">교사만 상담 내역을 조회할 수 있습니다.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${studentId}`)}>
          ← 돌아가기
        </Button>
        <h1 className="text-2xl font-semibold">상담 내역</h1>
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleFilterSubmit}>
          <label className="space-y-1">
            <span className="text-xs font-medium">시작일</span>
            <input type="date" className="block rounded-md border bg-background px-3 py-1.5 text-sm"
              value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">종료일</span>
            <input type="date" className="block rounded-md border bg-background px-3 py-1.5 text-sm"
              value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">키워드</span>
            <input type="text" className="block rounded-md border bg-background px-3 py-1.5 text-sm"
              placeholder="내용 검색..." value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} />
          </label>
          <Button type="submit" size="sm" variant="outline">검색</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => {
            setFilterFrom(""); setFilterTo(""); setFilterKeyword("")
            setActiveFilter({})
          }}>초기화</Button>
        </form>
      </section>

      {isLoading && <p className="text-sm text-muted-foreground">상담 내역 불러오는 중...</p>}
      {error && <p className="text-sm text-destructive">상담 내역을 불러오지 못했습니다.</p>}

      <div className="space-y-3">
        {records.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">조회된 상담 내역이 없습니다.</p>
        )}
        {records.map((r: ICounselingRecord) => (
          <div key={r._id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {new Date(r.counsel_date).toLocaleDateString("ko-KR")}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.is_shared ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {r.is_shared ? "공유됨" : "비공개"}
              </span>
            </div>
            <p className="mt-2 text-sm">{r.content}</p>
            {r.next_plan && (
              <p className="mt-1 text-xs text-muted-foreground">다음 계획: {r.next_plan}</p>
            )}
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">상담 기록 추가</h2>
        <form className="space-y-4" onSubmit={handleFormSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-medium">상담 날짜</span>
            <input required type="date" className="block w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">상담 내용</span>
            <textarea required rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={formContent} onChange={(e) => setFormContent(e.target.value)}
              placeholder="상담 내용을 입력하세요." />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">다음 계획 (선택)</span>
            <input type="text" className="block w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={formNextPlan} onChange={(e) => setFormNextPlan(e.target.value)}
              placeholder="후속 상담 계획 등..." />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={formShared} onChange={(e) => setFormShared(e.target.checked)} />
            다른 교사와 공유
          </label>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "저장 중..." : "상담 기록 저장"}
          </Button>
        </form>
      </section>
    </main>
  )
}

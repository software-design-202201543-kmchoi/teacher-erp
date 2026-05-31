import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { searchIntegrated } from "@/lib/api"
import { Button } from "@/components/ui/button"

const TYPES = [
  { key: "GRADE", label: "성적" },
  { key: "FEEDBACK", label: "피드백" },
  { key: "COUNSELING", label: "상담" },
] as const

export function SearchPage() {
  const { user } = useAuth()
  const [q, setQ] = useState("")
  const [subject, setSubject] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [types, setTypes] = useState<string[]>(["GRADE", "FEEDBACK", "COUNSELING"])
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["integrated-search", { q, subject, from, to, types, page }],
    queryFn: () => searchIntegrated({ q, subject, from, to, types, page, page_size: pageSize }),
    enabled: user?.role === "TEACHER",
  })

  if (user?.role !== "TEACHER") {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-muted-foreground">교사만 통합 검색을 사용할 수 있습니다.</p>
      </main>
    )
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">통합 검색</h1>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="학생명/내용 검색"
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="과목 (예: 수학)"
            value={subject}
            onChange={(e) => {
              setPage(1)
              setSubject(e.target.value)
            }}
          />
          <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value) }} />
          <input type="date" className="rounded-md border bg-background px-3 py-2 text-sm" value={to} onChange={(e) => { setPage(1); setTo(e.target.value) }} />
          <Button
            variant="outline"
            onClick={() => {
              setQ("")
              setSubject("")
              setFrom("")
              setTo("")
              setTypes(["GRADE", "FEEDBACK", "COUNSELING"])
              setPage(1)
            }}
          >
            초기화
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const active = types.includes(t.key)
            return (
              <Button
                key={t.key}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => {
                  setPage(1)
                  setTypes((prev) => active ? prev.filter((x) => x !== t.key) : [...prev, t.key])
                }}
              >
                {t.label}
              </Button>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>총 {total}건</span>
          <span>{isFetching ? "검색 중..." : isLoading ? "불러오는 중..." : "완료"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2">일시</th>
                <th className="px-3 py-2">학생</th>
                <th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">요약</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>검색 결과가 없습니다.</td>
                </tr>
              ) : items.map((it) => (
                <tr key={`${it.data_type}-${it.id}`} className="border-b">
                  <td className="px-3 py-2">{new Date(it.occurred_at).toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-2">{it.student_name} ({it.grade_level}-{it.class_num}-{it.student_num})</td>
                  <td className="px-3 py-2">
                    {it.data_type === "GRADE" ? "성적" : it.data_type === "FEEDBACK" ? "피드백" : "상담"}
                  </td>
                  <td className="px-3 py-2">{it.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</Button>
        </div>
      </section>
    </main>
  )
}

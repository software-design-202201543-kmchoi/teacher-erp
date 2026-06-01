import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { getAuditLog } from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { AuditLogEntry, AuditCollection } from "@teacher-erp/shared-types"

const COLLECTION_LABELS: Record<AuditCollection, string> = {
  grades: "성적",
  feedbacks: "피드백",
  counselingrecords: "상담",
  users: "사용자",
}

const OPERATION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "등록", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  update: { label: "수정", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  delete: { label: "삭제", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
}

function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const SKIP = new Set(["_id", "__v", "createdAt", "updatedAt"])
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ].filter((k) => !SKIP.has(k)))

  return (
    <div className="mt-2 overflow-x-auto rounded-lg border bg-muted/30 text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-3 py-1.5 font-medium">필드</th>
            <th className="px-3 py-1.5 font-medium">변경 전</th>
            <th className="px-3 py-1.5 font-medium">변경 후</th>
          </tr>
        </thead>
        <tbody>
          {[...keys].map((key) => {
            const bv = before?.[key]
            const av = after?.[key]
            const changed = JSON.stringify(bv) !== JSON.stringify(av)
            return (
              <tr key={key} className={changed ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                <td className="px-3 py-1 font-mono text-muted-foreground">{key}</td>
                <td className="px-3 py-1 text-red-600 dark:text-red-400">
                  {bv != null ? String(bv) : <span className="italic text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-1 text-emerald-600 dark:text-emerald-400">
                  {av != null ? String(av) : <span className="italic text-muted-foreground">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AuditEntry({ entry, expanded, onToggle }: {
  entry: AuditLogEntry
  expanded: boolean
  onToggle: () => void
}) {
  const op = OPERATION_LABELS[entry.operation] ?? { label: entry.operation, color: "" }
  const col = COLLECTION_LABELS[entry.collection] ?? entry.collection

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-start gap-2 px-4 py-3 text-left sm:flex-nowrap sm:gap-3"
      >
        <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${op.color}`}>
          {op.label}
        </span>
        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {col}
        </span>
        <span className="flex-1 text-sm">{entry.actor_name ?? entry.actor_id}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {new Date(entry.occurred_at).toLocaleString("ko-KR")}
        </span>
        <span className="shrink-0 text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t px-4 pb-3 pt-2">
          <DiffView before={entry.before} after={entry.after} />
        </div>
      )}
    </div>
  )
}

export function AuditPage() {
  const { id: studentId = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [filterCol, setFilterCol] = useState<string>("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (user?.role !== "TEACHER") {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-destructive">이력 조회는 교사만 접근할 수 있습니다.</p>
      </main>
    )
  }

  const { data, isLoading } = useQuery({
    queryKey: ["audit", studentId, filterCol],
    queryFn: () => getAuditLog(studentId, { collection: filterCol || undefined, limit: 100 }),
    enabled: Boolean(studentId),
  })

  const entries = data?.entries ?? []

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </Button>
        <h1 className="text-2xl font-semibold">변경 이력</h1>
        <span className="text-sm text-muted-foreground">
          {data?.total != null ? `총 ${data.total}건` : ""}
        </span>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        {(["", "grades", "feedbacks", "counselingrecords"] as const).map((col) => (
          <button
            key={col}
            onClick={() => setFilterCol(col)}
            className={[
              "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
              filterCol === col
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-border bg-background hover:bg-muted",
            ].join(" ")}
          >
            {col === "" ? "전체" : COLLECTION_LABELS[col]}
          </button>
        ))}
      </div>

      {/* 이력 목록 */}
      <div className="flex flex-col gap-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl border bg-muted" />
          ))
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">이력이 없습니다.</p>
        ) : (
          entries.map((entry) => (
            <AuditEntry
              key={entry._id}
              entry={entry}
              expanded={expandedId === entry._id}
              onToggle={() => setExpandedId(expandedId === entry._id ? null : entry._id)}
            />
          ))
        )}
      </div>
    </main>
  )
}

export default AuditPage

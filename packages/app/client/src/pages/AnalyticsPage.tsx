import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { useAuth } from "@/hooks/useAuth"
import {
  getAnalyticsAllSnapshots,
  getAnalyticsSnapshot,
  getAnalyticsSubjectProgress,
} from "@/lib/api"
import { Button } from "@/components/ui/button"

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="h-24 animate-pulse rounded-xl border bg-muted" />
  )
}

export function AnalyticsPage() {
  const { id: studentId = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // TEACHER-only guard — ProtectedRoute handles redirect but extra safety here
  if (user?.role !== "TEACHER") {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-destructive">분석 대시보드는 교사만 접근할 수 있습니다.</p>
      </main>
    )
  }

  const [activeTerm, setActiveTerm] = useState<string>("")

  // Fetch all available snapshots to populate term tabs
  const { data: allSnapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ["analytics-snapshots", studentId],
    queryFn: () => getAnalyticsAllSnapshots(studentId),
    enabled: Boolean(studentId),
    select: (data) => data.sort((a, b) => a.term.localeCompare(b.term)),
  })

  const terms = allSnapshots.map((s) => s.term)
  const effectiveTerm = activeTerm || terms[terms.length - 1] || ""

  // Fetch the selected term's snapshot
  const { data: snapshot, isLoading: snapshotLoading } = useQuery({
    queryKey: ["analytics-snapshot", studentId, effectiveTerm],
    queryFn: () => getAnalyticsSnapshot(studentId, effectiveTerm),
    enabled: Boolean(studentId) && Boolean(effectiveTerm),
  })

  // Fetch subject progress for line chart
  const { data: subjectProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["analytics-subject-progress", studentId],
    queryFn: () => getAnalyticsSubjectProgress(studentId),
    enabled: Boolean(studentId),
  })

  const isLoading = snapshotsLoading || snapshotLoading || progressLoading

  // Build line chart data: one row per term, one key per subject
  const allTerms = [...new Set(subjectProgress.flatMap((s) => s.score_history.map((h) => h.term)))].sort()
  const lineChartData = allTerms.map((term) => {
    const entry: Record<string, string | number> = { term }
    for (const subject of subjectProgress) {
      const h = subject.score_history.find((x) => x.term === term)
      if (h) entry[subject.subject_id.replace(/^subject-/, "")] = h.score
    }
    return entry
  })

  const subjectNames = subjectProgress.map((s) => s.subject_id.replace(/^subject-/, ""))
  const lineColors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"]

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </Button>
        <h1 className="text-2xl font-semibold">학습 현황 분석</h1>
        <span className="ml-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
          분석 DB 기반
        </span>
      </div>

      {/* 학기 탭 */}
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {terms.map((term) => (
            <button
              key={term}
              onClick={() => setActiveTerm(term)}
              className={[
                "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
                effectiveTerm === term
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-border bg-background hover:bg-muted",
              ].join(" ")}
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* 요약 카드 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">학기 요약</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : snapshot ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="전체 평균" value={`${snapshot.avg_score.toFixed(1)}점`} />
            <StatCard label="종합 등급" value={`${snapshot.overall_grade}등급`} />
            <StatCard label="피드백 수" value={`${snapshot.feedback_count}건`} />
            <StatCard label="상담 수" value={`${snapshot.counseling_count}건`} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">해당 학기 스냅샷이 없습니다.</p>
        )}
      </section>

      {/* 레이더 차트 — 과목별 점수 */}
      {snapshot && snapshot.subject_scores.length > 0 && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">과목별 점수 분포 ({effectiveTerm})</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart
              data={snapshot.subject_scores.map((s) => ({
                subject: s.subject_name,
                score: s.score,
              }))}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar
                dataKey="score"
                fill="#6366f1"
                fillOpacity={0.4}
                stroke="#6366f1"
              />
            </RadarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 선 차트 — 학기별 추세 */}
      {lineChartData.length > 1 && subjectNames.length > 0 && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">과목별 점수 추세</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="term" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {subjectNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={lineColors[i % lineColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 과목별 추세 배지 */}
      {subjectProgress.length > 0 && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">과목별 추세</h2>
          <div className="flex flex-wrap gap-3">
            {subjectProgress.map((s) => {
              const trendLabel =
                s.trend === "UP" ? "↑ 상승" : s.trend === "DOWN" ? "↓ 하락" : "→ 유지"
              const trendColor =
                s.trend === "UP"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : s.trend === "DOWN"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              return (
                <div
                  key={s.subject_id}
                  className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm"
                >
                  <span className="font-medium">
                    {s.subject_id.replace(/^subject-/, "")}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${trendColor}`}>
                    {trendLabel}
                  </span>
                  <span className="text-muted-foreground">
                    평균 {s.avg_score.toFixed(1)}점
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!isLoading && terms.length === 0 && (
        <p className="text-sm text-muted-foreground">
          아직 집계된 학습 데이터가 없습니다. 성적을 입력하면 분석 데이터가 생성됩니다.
        </p>
      )}
    </main>
  )
}

export default AnalyticsPage

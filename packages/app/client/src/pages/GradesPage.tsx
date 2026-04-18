import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts"
import { calcAverage } from "@teacher-erp/shared-utils"
import { useAuth } from "@/hooks/useAuth"
import { getGrades, createGrade, deleteGrade } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function GradesPage() {
  const { id: studentId = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const isTeacher = user?.role === "TEACHER"

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ["grades", studentId],
    queryFn: () => getGrades(studentId),
    enabled: Boolean(studentId),
  })

  const terms = [...new Set(grades.map((g) => g.term))].sort()
  const [activeTerm, setActiveTerm] = useState<string>("전체")

  const filteredGrades =
    activeTerm === "전체" ? grades : grades.filter((g) => g.term === activeTerm)

  const scores = filteredGrades.map((g) => g.score)
  const total = scores.reduce((a, b) => a + b, 0)
  const average = calcAverage(scores)

  const chartData = filteredGrades.map((g) => ({
    subject: g.subject_id.replace("subject-", ""),
    score: g.score,
  }))

  // 종합 등급: 평균 점수로 산출
  function deriveOverallGrade(avg: number): string {
    if (avg >= 96) return "1"
    if (avg >= 89) return "2"
    if (avg >= 77) return "3"
    if (avg >= 60) return "4"
    if (avg >= 40) return "5"
    if (avg >= 23) return "6"
    if (avg >= 11) return "7"
    if (avg >= 4) return "8"
    return "9"
  }

  const overallGrade = scores.length > 0 ? deriveOverallGrade(average) : "-"

  // 성적 입력 폼 상태
  const [newSubject, setNewSubject] = useState("")
  const [newTerm, setNewTerm] = useState("2026-1")
  const [newScore, setNewScore] = useState("")

  const createMutation = useMutation({
    mutationFn: (data: { subject_id: string; term: string; score: number }) =>
      createGrade(studentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grades", studentId] })
      setNewSubject("")
      setNewScore("")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (gradeId: string) => deleteGrade(gradeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grades", studentId] })
    },
  })

  function handleCreate() {
    const score = Number(newScore)
    if (!newSubject.trim() || !newTerm.trim() || isNaN(score)) return
    createMutation.mutate({
      subject_id: newSubject.trim(),
      term: newTerm.trim(),
      score,
    })
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </Button>
        <h1 className="text-2xl font-semibold">학생 성적 관리</h1>
      </div>

      {/* 학기 탭 */}
      <div className="flex flex-wrap gap-2">
        {["전체", ...terms].map((term) => (
          <button
            key={term}
            onClick={() => setActiveTerm(term)}
            className={[
              "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
              activeTerm === term
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-border bg-background hover:bg-muted",
            ].join(" ")}
          >
            {term}
          </button>
        ))}
      </div>

      {/* 성적 테이블 */}
      <section className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              성적을 불러오는 중...
            </p>
          ) : filteredGrades.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              등록된 성적이 없습니다.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">과목</th>
                  <th className="px-4 py-3 font-medium">학기</th>
                  <th className="px-4 py-3 font-medium">점수</th>
                  <th className="px-4 py-3 font-medium">등급</th>
                  {isTeacher && (
                    <th className="px-4 py-3 font-medium">관리</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((grade) => (
                  <tr
                    key={grade._id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      {grade.subject_id.replace("subject-", "")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {grade.term}
                    </td>
                    <td className="px-4 py-3 font-medium">{grade.score}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {grade.calculated_grade ?? "-"}등급
                      </span>
                    </td>
                    {isTeacher && (
                      <td className="px-4 py-3">
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => deleteMutation.mutate(grade._id)}
                          disabled={deleteMutation.isPending}
                        >
                          삭제
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {scores.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/50 font-medium">
                    <td
                      className="px-4 py-3 text-muted-foreground"
                      colSpan={isTeacher ? 5 : 4}
                    >
                      <span className="mr-6">총점: {total}</span>
                      <span className="mr-6">
                        평균: {average.toFixed(2)}
                      </span>
                      <span>종합 등급: {overallGrade}등급</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </section>

      {/* 레이더 차트 */}
      {chartData.length > 0 && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">과목별 성적 분포</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData}>
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

      {/* 성적 입력 폼 (교사만 표시) */}
      {isTeacher && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">성적 입력</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">과목명</label>
              <input
                className="h-8 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="예) 국어"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">학기</label>
              <input
                className="h-8 w-28 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="예) 2026-1"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">점수</label>
              <input
                type="number"
                min={0}
                max={100}
                className="h-8 w-24 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0~100"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                !newSubject.trim() ||
                !newTerm.trim() ||
                newScore === ""
              }
            >
              {createMutation.isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
          {createMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              성적 추가에 실패했습니다.
            </p>
          )}
        </section>
      )}
    </main>
  )
}

export default GradesPage

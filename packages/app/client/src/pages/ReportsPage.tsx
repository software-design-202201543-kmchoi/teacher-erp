import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer"
import { useAuth } from "@/hooks/useAuth"
import { getGradeReport, getCounselingReport, getFeedbackReport } from "@/lib/api"
import { Button } from "@/components/ui/button"

type Tab = "grades" | "counseling" | "feedback"

const TAB_LABELS: Record<Tab, string> = {
  grades: "성적 보고서",
  counseling: "상담 보고서",
  feedback: "피드백 요약",
}

export function ReportsPage() {
  const { id: studentId = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<Tab>("grades")

  if (user?.role !== "TEACHER") {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-destructive">보고서 페이지는 교사만 접근할 수 있습니다.</p>
      </main>
    )
  }

  const { data: gradeReport, isLoading: gradeLoading } = useQuery({
    queryKey: ["report-grades", studentId],
    queryFn: () => getGradeReport(studentId),
    enabled: Boolean(studentId),
  })

  const { data: counselingReport, isLoading: counselingLoading } = useQuery({
    queryKey: ["report-counseling", studentId],
    queryFn: () => getCounselingReport(studentId),
    enabled: Boolean(studentId),
  })

  const { data: feedbackReport, isLoading: feedbackLoading } = useQuery({
    queryKey: ["report-feedback", studentId],
    queryFn: () => getFeedbackReport(studentId),
    enabled: Boolean(studentId),
  })

  const studentName = gradeReport?.student.name ?? counselingReport?.student.name ?? feedbackReport?.student.name ?? ""

  async function handlePdfDownload() {
    if (!gradeReport || !counselingReport || !feedbackReport) return

    const styles = StyleSheet.create({
      page: { padding: 24, fontSize: 10, lineHeight: 1.5 },
      title: { fontSize: 16, marginBottom: 8, fontWeight: 700 },
      sectionTitle: { fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: 700 },
      row: { marginBottom: 2 },
      summary: { marginBottom: 6 },
    })

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>{studentName || studentId} 보고서</Text>
          <Text style={styles.summary}>생성일: {new Date().toLocaleDateString("ko-KR")}</Text>

          <Text style={styles.sectionTitle}>성적 보고서</Text>
          <Text style={styles.summary}>
            전체 평균 {gradeReport.allTimeAverage.toFixed(1)}점 / 총 과목 {gradeReport.totalSubjects}개
          </Text>
          {gradeReport.termSummaries.map((ts) => (
            <View key={ts.term} style={styles.row}>
              <Text>{ts.term} - 평균 {ts.average.toFixed(1)}점 / {ts.overallGrade}등급</Text>
              {ts.grades.map((g) => (
                <Text key={g._id}>· {g.subject_id.replace(/^subject-/, "")}: {g.score}점 ({g.calculated_grade}등급)</Text>
              ))}
            </View>
          ))}

          <Text style={styles.sectionTitle}>상담 보고서</Text>
          <Text style={styles.summary}>
            총 상담 {counselingReport.totalSessions}회 / 공유 {counselingReport.sharedSessions}회
          </Text>
          {counselingReport.records.map((r) => (
            <Text key={r._id}>· {r.counsel_date} {r.is_shared ? "[공유]" : ""} {r.content}</Text>
          ))}

          <Text style={styles.sectionTitle}>피드백 요약</Text>
          <Text style={styles.summary}>
            총 피드백 {feedbackReport.totalFeedbacks}건
          </Text>
          {feedbackReport.recentFeedbacks.map((f) => (
            <Text key={f._id}>· [{f.type}/{f.visibility}] {f.content}</Text>
          ))}
        </Page>
      </Document>
    )

    const blob = await pdf(doc).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${studentName || studentId}_종합보고서.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExcelDownload() {
    if (!gradeReport) return

    const wb = XLSX.utils.book_new()

    // 성적 상세
    const gradeRows = gradeReport.termSummaries.flatMap((ts) =>
      ts.grades.map((g) => ({
        학기: ts.term,
        과목: g.subject_id.replace(/^subject-/, ""),
        점수: g.score,
        등급: g.calculated_grade,
      }))
    )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gradeRows), "성적 상세")

    // 학기별 요약
    const summaryRows = gradeReport.termSummaries.map((ts) => ({
      학기: ts.term,
      총점: ts.total,
      평균: Number(ts.average.toFixed(1)),
      종합등급: ts.overallGrade,
      과목수: ts.subjectCount,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "학기별 요약")

    XLSX.writeFile(wb, `${studentName || studentId}_성적보고서.xlsx`)
  }

  const isLoading = gradeLoading || counselingLoading || feedbackLoading

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            ← 뒤로가기
          </Button>
          <h1 className="text-2xl font-semibold">
            {studentName ? `${studentName} — 보고서` : "보고서"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePdfDownload}>
            PDF 저장
          </Button>
          <Button variant="outline" size="sm" onClick={handleExcelDownload} disabled={!gradeReport}>
            Excel 다운로드
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <nav className="flex gap-1 border-b print:hidden">
        {(["grades", "counseling", "feedback"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">보고서를 불러오는 중...</p>
      )}

      {/* 출력 영역 */}
      <div className="flex flex-col gap-6">

        {/* 성적 보고서 */}
        {(activeTab === "grades") && gradeReport && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">성적 보고서</h2>
              <p className="text-xs text-muted-foreground">생성: {new Date(gradeReport.generatedAt).toLocaleDateString("ko-KR")}</p>
            </div>
            <div className="mb-4 flex gap-6 text-sm">
              <span>전체 평균: <strong>{gradeReport.allTimeAverage.toFixed(1)}점</strong></span>
              <span>총 과목 수: <strong>{gradeReport.totalSubjects}개</strong></span>
            </div>
            {gradeReport.termSummaries.map((ts) => (
              <div key={ts.term} className="mb-6">
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="font-medium">{ts.term}</h3>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    평균 {ts.average.toFixed(1)}점 / {ts.overallGrade}등급
                  </span>
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">과목</th>
                      <th className="px-3 py-2 text-right font-medium">점수</th>
                      <th className="px-3 py-2 text-right font-medium">등급</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ts.grades.map((g) => (
                      <tr key={g._id} className="border-b last:border-0">
                        <td className="px-3 py-2">{g.subject_id.replace(/^subject-/, "")}</td>
                        <td className="px-3 py-2 text-right">{g.score}</td>
                        <td className="px-3 py-2 text-right">{g.calculated_grade}등급</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="px-3 py-2">합계</td>
                      <td className="px-3 py-2 text-right">{ts.total}</td>
                      <td className="px-3 py-2 text-right">{ts.overallGrade}등급</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </section>
        )}

        {/* 상담 보고서 */}
        {(activeTab === "counseling") && counselingReport && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">상담 보고서</h2>
              <p className="text-xs text-muted-foreground">생성: {new Date(counselingReport.generatedAt).toLocaleDateString("ko-KR")}</p>
            </div>
            <div className="mb-4 flex gap-6 text-sm">
              <span>총 상담 횟수: <strong>{counselingReport.totalSessions}회</strong></span>
              <span>공유 상담: <strong>{counselingReport.sharedSessions}회</strong></span>
            </div>
            <div className="flex flex-col gap-3">
              {counselingReport.records.map((r) => (
                <div key={r._id} className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{r.counsel_date}</span>
                    {r.is_shared && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">공유됨</span>
                    )}
                  </div>
                  <p className="text-sm">{r.content}</p>
                  {r.next_plan && (
                    <p className="mt-1 text-xs text-muted-foreground">다음 계획: {r.next_plan}</p>
                  )}
                </div>
              ))}
              {counselingReport.records.length === 0 && (
                <p className="text-sm text-muted-foreground">상담 기록이 없습니다.</p>
              )}
            </div>
          </section>
        )}

        {/* 피드백 요약 */}
        {(activeTab === "feedback") && feedbackReport && (
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">피드백 요약</h2>
              <p className="text-xs text-muted-foreground">생성: {new Date(feedbackReport.generatedAt).toLocaleDateString("ko-KR")}</p>
            </div>
            <div className="mb-4 flex gap-6 text-sm">
              <span>총 피드백: <strong>{feedbackReport.totalFeedbacks}건</strong></span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(feedbackReport.byType).map(([type, count]) => (
                <div key={type} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{type}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              ))}
            </div>

            <h3 className="mb-2 text-sm font-medium text-muted-foreground">최근 피드백</h3>
            <div className="flex flex-col gap-2">
              {feedbackReport.recentFeedbacks.map((f) => (
                <div key={f._id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{f.type}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">{f.visibility}</span>
                  </div>
                  <p className="text-sm">{f.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

    </main>
  )
}

export default ReportsPage

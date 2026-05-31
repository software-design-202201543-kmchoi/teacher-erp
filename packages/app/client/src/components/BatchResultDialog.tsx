import { useState } from "react"
import * as XLSX from "xlsx"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { BatchCreateResponse } from "@teacher-erp/shared-types"

function exportSuccessXlsx(result: BatchCreateResponse) {
  const rows = result.created.map(({ student, tempPassword }) => ({
    이름: student.name,
    학년: student.grade_level,
    반: student.class_num,
    번호: student.student_num,
    이메일: student.email,
    임시비밀번호: tempPassword,
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // 컬럼 너비 설정
  ws["!cols"] = [
    { wch: 10 }, // 이름
    { wch: 6 },  // 학년
    { wch: 6 },  // 반
    { wch: 6 },  // 번호
    { wch: 28 }, // 이메일
    { wch: 14 }, // 임시비밀번호
  ]

  XLSX.utils.book_append_sheet(wb, ws, "등록 결과")
  XLSX.writeFile(wb, `학생_등록_결과_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function exportFailedXlsx(result: BatchCreateResponse) {
  const rows = result.failed.map(({ input, reason }) => ({
    이름: input.name,
    학년: input.grade_level,
    반: input.class_num,
    번호: input.student_num,
    실패이유: reason,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "실패 목록")
  XLSX.writeFile(wb, `학생_등록_실패_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

interface BatchResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: BatchCreateResponse | null
}

export function BatchResultDialog({ open, onOpenChange, result }: BatchResultDialogProps) {
  const [hasSaved, setHasSaved] = useState(false)
  const [tab, setTab] = useState<"created" | "failed">("created")

  if (!result) return null

  function handleExportSuccess() {
    if (!result) return
    exportSuccessXlsx(result)
    setHasSaved(true)
  }

  function handleOpenChange(o: boolean) {
    if (!o && result !== null && result.created.length > 0 && !hasSaved) {
      if (!window.confirm(
        "임시 비밀번호를 아직 저장하지 않았습니다.\n이 창을 닫으면 다시 확인할 수 없습니다.\n\n닫으시겠습니까?"
      )) return
    }
    if (!o) { setHasSaved(false); setTab("created") }
    onOpenChange(o)
  }

  const showTabs = result.created.length > 0 && result.failed.length > 0

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>일괄 등록 결과</DialogTitle>
        </DialogHeader>

        {/* 요약 */}
        <div className="flex gap-3">
          {result.created.length > 0 && (
            <div className="flex-1 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                성공 {result.created.length}명
              </p>
            </div>
          )}
          {result.failed.length > 0 && (
            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                실패 {result.failed.length}명
              </p>
            </div>
          )}
        </div>

        {/* 비밀번호 저장 안내 */}
        {result.created.length > 0 && !hasSaved && (
          <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              임시 비밀번호는 지금만 확인할 수 있습니다. 창을 닫기 전에 반드시 Excel로 저장하세요.
            </p>
            <Button size="sm" onClick={handleExportSuccess} className="shrink-0">
              Excel 저장
            </Button>
          </div>
        )}

        {/* 탭 */}
        {showTabs && (
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(["created", "failed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "created" ? "성공 목록" : "실패 목록"}
              </button>
            ))}
          </div>
        )}

        {/* 성공 테이블 */}
        {(tab === "created" || !showTabs) && result.created.length > 0 && (
          <div className="overflow-auto rounded-lg border max-h-64">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">이름</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">학년/반/번호</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">이메일</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">임시 비밀번호</th>
                </tr>
              </thead>
              <tbody>
                {result.created.map(({ student, tempPassword }) => (
                  <tr key={student._id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{student.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {student.grade_level}학년 {student.class_num}반 {student.student_num}번
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{student.email}</td>
                    <td className="px-3 py-2 font-mono text-xs">{tempPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 실패 테이블 */}
        {(tab === "failed" || !showTabs) && result.failed.length > 0 && (
          <div className="overflow-auto rounded-lg border max-h-64">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">이름</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">입력값</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">실패 이유</th>
                </tr>
              </thead>
              <tbody>
                {result.failed.map(({ input, reason }, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-3 py-2">{input.name || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {input.grade_level}학년 {input.class_num}반 {input.student_num}번
                    </td>
                    <td className="px-3 py-2 text-destructive text-xs">{reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 하단 액션 */}
        <div className="flex justify-between pt-2">
          <div>
            {result.failed.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportFailedXlsx(result)}>
                실패 목록 Excel 저장
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {result.created.length > 0 && hasSaved && (
              <Button variant="outline" size="sm" onClick={handleExportSuccess}>
                Excel 재저장
              </Button>
            )}
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}

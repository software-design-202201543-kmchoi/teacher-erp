import { useState } from "react"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { BatchCreateResponse } from "@teacher-erp/shared-types"

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface BatchResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: BatchCreateResponse | null
}

export function BatchResultDialog({
  open,
  onOpenChange,
  result,
}: BatchResultDialogProps) {
  const [hasSaved, setHasSaved] = useState(false)
  const [tab, setTab] = useState<"created" | "failed">("created")

  if (!result) return null

  function handleExportSuccess() {
    if (!result) return
    const header = "이름,학년,반,번호,이메일,임시비밀번호"
    const rows = result.created.map(
      ({ student, tempPassword }) =>
        `${student.name},${student.grade_level},${student.class_num},${student.student_num},${student.email},${tempPassword}`
    )
    downloadCSV([header, ...rows].join("\n"), "학생_등록_결과.csv")
    setHasSaved(true)
  }

  function handleExportFailed() {
    if (!result) return
    const header = "이름,학년,반,번호,이메일,임시비밀번호,실패이유"
    const rows = result.failed.map(
      ({ input, reason }) =>
        `${input.name},${input.grade_level},${input.class_num},${input.student_num},${input.email ?? ""},${input.password ?? ""},${reason}`
    )
    downloadCSV([header, ...rows].join("\n"), "학생_등록_실패_목록.csv")
  }

  function handleOpenChange(o: boolean) {
    if (!o && result !== null && result.created.length > 0 && !hasSaved) {
      if (
        !window.confirm(
          "임시 비밀번호를 아직 저장하지 않았습니다.\n이 창을 닫으면 다시 확인할 수 없습니다.\n\n닫으시겠습니까?"
        )
      )
        return
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

        {/* Summary */}
        <div className="flex gap-3">
          {result.created.length > 0 && (
            <div className="flex-1 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm font-medium text-green-700">
                성공 {result.created.length}명
              </p>
            </div>
          )}
          {result.failed.length > 0 && (
            <div className="flex-1 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-medium text-red-700">
                실패 {result.failed.length}명
              </p>
            </div>
          )}
        </div>

        {/* Password warning */}
        {result.created.length > 0 && !hasSaved && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800">
              임시 비밀번호는 이 창을 닫으면 다시 확인할 수 없습니다. 아래 CSV로 저장하세요.
            </p>
          </div>
        )}

        {/* Tab switcher */}
        {showTabs && (
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "created"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("created")}
            >
              성공 목록
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "failed"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab("failed")}
            >
              실패 목록
            </button>
          </div>
        )}

        {/* Success table */}
        {(tab === "created" || !showTabs) && result.created.length > 0 && (
          <div className="overflow-auto rounded-lg border max-h-72">
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

        {/* Failed table */}
        {(tab === "failed" || !showTabs) && result.failed.length > 0 && (
          <div className="overflow-auto rounded-lg border max-h-72">
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

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <div>
            {result.failed.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportFailed}>
                실패 목록 재다운로드
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {result.created.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportSuccess}>
                {hasSaved ? "결과 CSV 재저장" : "결과 CSV 저장"}
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

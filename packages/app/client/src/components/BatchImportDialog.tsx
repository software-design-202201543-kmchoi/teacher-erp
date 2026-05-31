import { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { validateBatchRow } from "@teacher-erp/shared-utils"
import type { BatchStudentInput, BatchCreateResponse } from "@teacher-erp/shared-types"
import { batchCreateStudents } from "@/lib/api"

// 이메일·비밀번호는 서버에서 자동 생성 — CSV에서 받지 않음
const TEMPLATE_CSV = "이름,학년,반,번호\n홍길동,1,2,15\n김철수,2,1,7"

const COLUMN_ALIASES: Record<string, string> = {
  이름: "name", name: "name",
  학년: "grade_level", grade_level: "grade_level",
  반: "class_num", class_num: "class_num",
  번호: "student_num", student_num: "student_num",
}

interface PreviewRow {
  rowIndex: number
  name: string
  grade_level_raw: string
  class_num_raw: string
  student_num_raw: string
  errors: string[]
}

function parseCSV(text: string): string[][] {
  return text.trim().split(/\r?\n/).map((line) => {
    const cols: string[] = []
    let cur = ""
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes
      else if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = "" }
      else cur += ch
    }
    cols.push(cur.trim())
    return cols
  })
}

function csvToPreviewRows(text: string): { rows: PreviewRow[]; error: string | null } {
  const lines = parseCSV(text)
  if (lines.length < 2) return { rows: [], error: "데이터 행이 없습니다" }

  const header = lines[0].map((h) => COLUMN_ALIASES[h.trim()] ?? h.trim())
  const nameIdx = header.indexOf("name")
  const gradeIdx = header.indexOf("grade_level")
  const classIdx = header.indexOf("class_num")
  const numIdx = header.indexOf("student_num")

  if (nameIdx === -1 || gradeIdx === -1 || classIdx === -1 || numIdx === -1) {
    return { rows: [], error: "필수 컬럼(이름, 학년, 반, 번호)이 없습니다" }
  }

  const rows: PreviewRow[] = lines
    .slice(1)
    .map((cols, i) => {
      const name = cols[nameIdx] ?? ""
      const grade_level_raw = cols[gradeIdx] ?? ""
      const class_num_raw = cols[classIdx] ?? ""
      const student_num_raw = cols[numIdx] ?? ""

      const errors = validateBatchRow({
        name,
        grade_level: Number(grade_level_raw),
        class_num: Number(class_num_raw),
        student_num: Number(student_num_raw),
      } as BatchStudentInput)

      return { rowIndex: i + 2, name, grade_level_raw, class_num_raw, student_num_raw, errors }
    })
    .filter((r) => r.name || r.grade_level_raw || r.class_num_raw || r.student_num_raw)

  return { rows, error: null }
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface BatchImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (result: BatchCreateResponse) => void
}

export function BatchImportDialog({ open, onOpenChange, onResult }: BatchImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload")
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (students: BatchStudentInput[]) => batchCreateStudents(students),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["students"] })
      onOpenChange(false)
      onResult(result)
      resetState()
    },
  })

  function resetState() {
    setStep("upload")
    setRows([])
    setFileName("")
    setParseError(null)
    mutation.reset()
  }

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { rows: parsed, error } = csvToPreviewRows(text)
      if (error) { setParseError(error); return }
      setParseError(null)
      setRows(parsed)
      setStep("preview")
    }
    reader.readAsText(file, "UTF-8")
  }

  function handleSubmit() {
    const students: BatchStudentInput[] = rows
      .filter((r) => r.errors.length === 0)
      .map((r) => ({
        name: r.name,
        grade_level: Number(r.grade_level_raw),
        class_num: Number(r.class_num_raw),
        student_num: Number(r.student_num_raw),
        // 이메일·비밀번호 미전송 → 서버가 자동 생성
      }))
    mutation.mutate(students)
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length
  const errorCount = rows.filter((r) => r.errors.length > 0).length

  return (
    <DialogRoot
      open={open}
      onOpenChange={(o) => {
        if (mutation.isPending) return
        if (!o) resetState()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>학생 일괄 등록</DialogTitle>
        </DialogHeader>

        {step === "upload" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              CSV 파일로 여러 학생을 한 번에 등록합니다. 이메일과 비밀번호는 자동으로 생성됩니다.
              최대 200명까지 가능합니다.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => downloadCSV(TEMPLATE_CSV, "학생_일괄등록_템플릿.csv")}
            >
              템플릿 다운로드 (.csv)
            </Button>

            <div
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm font-medium">CSV 파일을 드래그하거나 클릭해 선택</p>
              <p className="text-xs text-muted-foreground">이름, 학년, 반, 번호 컬럼 필수 · .csv (UTF-8)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ""
                }}
              />
            </div>

            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground truncate max-w-xs">{fileName}</p>
              <div className="flex gap-3 text-sm shrink-0">
                {validCount > 0 && <span className="text-green-600 font-medium">{validCount}명 등록 가능</span>}
                {errorCount > 0 && <span className="text-destructive font-medium">{errorCount}명 오류</span>}
              </div>
            </div>

            <div className="overflow-auto rounded-lg border max-h-72">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">이름</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">학년</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">반</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">번호</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowIndex}
                      className={`border-b last:border-b-0 ${row.errors.length > 0 ? "bg-destructive/5" : ""}`}
                    >
                      <td className="px-3 py-2">{row.name || <span className="italic text-muted-foreground">-</span>}</td>
                      <td className="px-3 py-2">{row.grade_level_raw || "-"}</td>
                      <td className="px-3 py-2">{row.class_num_raw || "-"}</td>
                      <td className="px-3 py-2">{row.student_num_raw || "-"}</td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 ? (
                          <span
                            className="text-destructive text-xs cursor-help underline decoration-dotted"
                            title={row.errors.join(", ")}
                          >
                            오류 ({row.errors.length})
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">정상</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && validCount > 0 && (
              <p className="text-xs text-muted-foreground">
                오류 행은 제외하고 정상 행 {validCount}명만 등록됩니다.
              </p>
            )}
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : "등록 중 오류가 발생했습니다"}
              </p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("upload")} disabled={mutation.isPending}>
                이전으로
              </Button>
              <Button onClick={handleSubmit} disabled={validCount === 0 || mutation.isPending}>
                {mutation.isPending ? "등록 중..." : `${validCount}명 등록하기`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  )
}

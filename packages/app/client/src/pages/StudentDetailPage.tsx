import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { getStudent, getAcademicRecord, updateAcademicRecord } from "@/lib/api"

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, ability } = useAuth()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [attendanceInput, setAttendanceInput] = useState("")
  const [notesInput, setNotesInput] = useState("")

  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
  } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudent(id!),
    enabled: Boolean(id),
  })

  const {
    data: academicRecord,
    isLoading: recordLoading,
    isError: recordError,
  } = useQuery({
    queryKey: ["academic-record", id],
    queryFn: () => getAcademicRecord(id!),
    enabled: Boolean(id),
  })

  const mutation = useMutation({
    mutationFn: (data: { attendance_info?: string; special_notes?: string }) =>
      updateAcademicRecord(id!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["academic-record", id] })
      setIsEditing(false)
    },
  })

  const canEdit = ability.can("update", "Student") || user?.role === "TEACHER"

  function handleEditStart() {
    setAttendanceInput(academicRecord?.attendance_info ?? "")
    setNotesInput(academicRecord?.special_notes ?? "")
    setIsEditing(true)
  }

  function handleSave() {
    mutation.mutate({
      attendance_info: attendanceInput,
      special_notes: notesInput,
    })
  }

  if (studentLoading || recordLoading) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-muted-foreground">학생 정보를 불러오는 중...</p>
      </main>
    )
  }

  if (studentError || !student) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-destructive">학생 정보를 불러오지 못했습니다.</p>
        <Button variant="outline" onClick={() => navigate("/students")}>
          목록으로 돌아가기
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      {/* 뒤로가기 */}
      <div>
        <Button variant="outline" onClick={() => navigate("/students")}>
          ← 학생 목록
        </Button>
      </div>

      {/* 기본 정보 카드 */}
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{student.name}</h1>
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">학년</p>
            <p className="font-medium">{student.grade_level}학년</p>
          </div>
          <div>
            <p className="text-muted-foreground">반</p>
            <p className="font-medium">{student.class_num}반</p>
          </div>
          <div>
            <p className="text-muted-foreground">번호</p>
            <p className="font-medium">{student.student_num}번</p>
          </div>
        </div>
      </section>

      {/* 하위 탭 네비게이션 */}
      <nav className="flex gap-1 border-b">
        <Link to={`/students/${id}`} className="border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary">학생부</Link>
        <Link to={`/students/${id}/grades`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">성적</Link>
        <Link to={`/students/${id}/feedback`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">피드백</Link>
        <Link to={`/students/${id}/counseling`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">상담</Link>
      </nav>

      {/* 학생부 카드 */}
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">학생부</h2>
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleEditStart}>
              편집
            </Button>
          )}
        </div>

        {recordError && (
          <p className="mt-2 text-sm text-destructive">학생부 정보를 불러오지 못했습니다.</p>
        )}

        {!recordError && (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">출결</p>
              {isEditing ? (
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  value={attendanceInput}
                  onChange={(e) => setAttendanceInput(e.target.value)}
                  placeholder="출결 정보를 입력하세요"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {academicRecord?.attendance_info || (
                    <span className="text-muted-foreground italic">없음</span>
                  )}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">특기사항</p>
              {isEditing ? (
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={4}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="특기사항을 입력하세요"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {academicRecord?.special_notes || (
                    <span className="text-muted-foreground italic">없음</span>
                  )}
                </p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "저장 중..." : "저장"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={mutation.isPending}
                >
                  취소
                </Button>
                {mutation.isError && (
                  <p className="text-sm text-destructive self-center">저장에 실패했습니다.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

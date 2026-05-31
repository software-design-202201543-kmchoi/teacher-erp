import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { getStudent, getAcademicRecord, updateAcademicRecord, getStudentParents, linkParent, unlinkParent } from "@/lib/api"

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, ability } = useAuth()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [absences, setAbsences] = useState(0)
  const [tardies, setTardies] = useState(0)
  const [earlyLeaves, setEarlyLeaves] = useState(0)
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
    mutationFn: (data: {
      attendance_info?: { absences?: number; tardies?: number; earlyLeaves?: number }
      special_notes?: string
    }) => updateAcademicRecord(id!, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["academic-record", id] })
      setIsEditing(false)
    },
  })

  const canEdit = ability.can("update", "Student") || user?.role === "TEACHER"
  const isTeacher = user?.role === "TEACHER"

  // 학부모 관리 상태
  const [parentEmail, setParentEmail] = useState("")
  const [parentName, setParentName] = useState("")
  const [parentLinkMsg, setParentLinkMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const { data: parentsData, isLoading: parentsLoading } = useQuery({
    queryKey: ["student-parents", id],
    queryFn: () => getStudentParents(id!),
    enabled: Boolean(id) && isTeacher,
  })

  const linkMutation = useMutation({
    mutationFn: () => linkParent(id!, { email: parentEmail.trim(), name: parentName.trim() || undefined }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["student-parents", id] })
      setParentEmail("")
      setParentName("")
      setParentLinkMsg({
        type: "ok",
        text: result.isNew
          ? `학부모 계정 생성 완료 (임시 비밀번호: ${result.tempPassword})`
          : "기존 학부모 계정에 연결했습니다.",
      })
    },
    onError: () => setParentLinkMsg({ type: "err", text: "연결에 실패했습니다." }),
  })

  const unlinkMutation = useMutation({
    mutationFn: (parentId: string) => unlinkParent(id!, parentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["student-parents", id] }),
  })

  function handleEditStart() {
    setAbsences(academicRecord?.attendance_info?.absences ?? 0)
    setTardies(academicRecord?.attendance_info?.tardies ?? 0)
    setEarlyLeaves(academicRecord?.attendance_info?.earlyLeaves ?? 0)
    setNotesInput(academicRecord?.special_notes ?? "")
    setIsEditing(true)
  }

  function handleSave() {
    mutation.mutate({
      attendance_info: { absences, tardies, earlyLeaves },
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
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
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
      <nav className="flex gap-1 overflow-x-auto border-b pb-1">
        <Link to={`/students/${id}`} className="border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary">학생부</Link>
        <Link to={`/students/${id}/grades`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">성적</Link>
        <Link to={`/students/${id}/feedback`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">피드백</Link>
        {user?.role !== "PARENT" && (
          <Link to={`/students/${id}/counseling`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">상담</Link>
        )}
        {user?.role === "TEACHER" && (
          <Link to={`/students/${id}/analytics`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">분석</Link>
        )}
        {user?.role === "TEACHER" && (
          <Link to={`/students/${id}/reports`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">보고서</Link>
        )}
        {user?.role === "TEACHER" && (
          <Link to={`/students/${id}/audit`} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">이력</Link>
        )}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      { label: "결석", value: absences, setter: setAbsences },
                      { label: "지각", value: tardies, setter: setTardies },
                      { label: "조퇴", value: earlyLeaves, setter: setEarlyLeaves },
                    ] as const
                  ).map(({ label, value, setter }) => (
                    <label key={label} className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {label}
                      <input
                        type="number"
                        min={0}
                        className="rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={value}
                        onChange={(e) => setter(Number(e.target.value))}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm">
                  결석 {academicRecord?.attendance_info?.absences ?? 0}일 ·{" "}
                  지각 {academicRecord?.attendance_info?.tardies ?? 0}회 ·{" "}
                  조퇴 {academicRecord?.attendance_info?.earlyLeaves ?? 0}회
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

      {/* 학부모 관리 — TEACHER 전용 */}
      {isTeacher && (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">학부모 연결</h2>

          {/* 연결된 학부모 목록 */}
          {parentsLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : (parentsData?.parents.length ?? 0) > 0 ? (
            <ul className="mb-4 flex flex-col gap-2">
              {parentsData!.parents.map((p) => (
                <li key={p._id} className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => unlinkMutation.mutate(p._id)}
                    disabled={unlinkMutation.isPending}
                  >
                    연결 해제
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">연결된 학부모가 없습니다.</p>
          )}

          {/* 학부모 연결 폼 */}
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground">학부모 연결 / 신규 생성</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="학부모 이름 (선택)"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="h-8 flex-1 min-w-36 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="email"
                placeholder="이메일 (필수)"
                value={parentEmail}
                onChange={(e) => { setParentEmail(e.target.value); setParentLinkMsg(null) }}
                className="h-8 flex-1 min-w-52 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="sm"
                onClick={() => { setParentLinkMsg(null); linkMutation.mutate() }}
                disabled={!parentEmail.trim() || linkMutation.isPending}
              >
                {linkMutation.isPending ? "처리 중..." : "연결"}
              </Button>
            </div>
            {parentLinkMsg && (
              <p className={`text-xs ${parentLinkMsg.type === "ok" ? "text-green-600 dark:text-green-400 font-mono" : "text-destructive"}`}>
                {parentLinkMsg.text}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              이미 계정이 있는 이메일이면 기존 계정에 연결됩니다. 없으면 새 학부모 계정이 자동 생성됩니다.
            </p>
          </div>
        </section>
      )}
    </main>
  )
}

import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { getStudents, getNotifications, getGrades, getFeedback } from "@/lib/api"

function QuickCard({
  title,
  value,
  sub,
  to,
}: {
  title: string
  value: string | number
  sub?: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Link>
  )
}

export function DashboardPage() {
  const { user, logout } = useAuth()

  const isTeacher = user?.role === "TEACHER"
  const isStudent = user?.role === "STUDENT"
  const isParent = user?.role === "PARENT"

  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
    enabled: isTeacher,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: Boolean(user),
  })

  // For STUDENT/PARENT: load own grades/feedback
  const ownStudentId = isStudent ? user?._id : undefined

  const { data: ownGrades = [] } = useQuery({
    queryKey: ["grades", ownStudentId],
    queryFn: () => getGrades(ownStudentId!),
    enabled: Boolean(ownStudentId),
  })

  const { data: ownFeedback = [] } = useQuery({
    queryKey: ["feedback", ownStudentId],
    queryFn: () => getFeedback(ownStudentId!),
    enabled: Boolean(ownStudentId),
  })

  const unread = notifications.filter((n) => !n.is_read).length

  if (!user) return null

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      {/* 환영 헤더 */}
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Teacher ERP</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {user.name}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            ({user.role === "TEACHER" ? "교사" : user.role === "STUDENT" ? "학생" : "학부모"})
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </section>

      {/* 교사 대시보드 */}
      {isTeacher && (
        <>
          <h2 className="text-base font-semibold text-muted-foreground">현황 요약</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <QuickCard
              title="담당 학생"
              value={studentsData?.students.length ?? "—"}
              sub="전체 학생 수"
              to="/students"
            />
            <QuickCard
              title="미읽음 알림"
              value={unread}
              sub="알림 전체 보기"
              to="/notifications"
            />
            <QuickCard
              title="학생 목록"
              value="→"
              sub="성적·피드백·상담 관리"
              to="/students"
            />
          </div>

          {/* 최근 학생 목록 */}
          {studentsData && studentsData.students.length > 0 && (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">학생 바로가기</h2>
                <Link to="/students" className="text-xs text-primary hover:underline">
                  전체 보기
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {studentsData.students.slice(0, 5).map((s) => (
                  <Link
                    key={s._id}
                    to={`/students/${s._id}`}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">
                      {s.grade_level}학년 {s.class_num}반 {s.student_num}번
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* 학생 대시보드 */}
      {isStudent && (
        <>
          <h2 className="text-base font-semibold text-muted-foreground">내 학습 현황</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickCard
              title="성적 기록"
              value={ownGrades.length}
              sub="과목별 성적 보기"
              to={`/students/${user._id}/grades`}
            />
            <QuickCard
              title="공개 피드백"
              value={ownFeedback.filter((f) => f.visibility !== "PRIVATE").length}
              sub="피드백 보기"
              to={`/students/${user._id}/feedback`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <QuickCard
              title="미읽음 알림"
              value={unread}
              sub="알림 확인"
              to="/notifications"
            />
            <QuickCard
              title="학생부"
              value="→"
              sub="출결·특기사항"
              to={`/students/${user._id}`}
            />
          </div>
        </>
      )}

      {/* 학부모 대시보드 */}
      {isParent && (
        <>
          <h2 className="text-base font-semibold text-muted-foreground">자녀 현황</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickCard
              title="미읽음 알림"
              value={unread}
              sub="성적·피드백 업데이트"
              to="/notifications"
            />
          </div>
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">
              자녀의 성적과 피드백 정보는 알림을 통해 확인하거나, 담당 교사로부터 공유받은 정보를 알림에서 확인하세요.
            </p>
          </section>
        </>
      )}

      {/* 로그아웃 */}
      <div className="pt-2">
        <button
          onClick={() => void logout()}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          로그아웃
        </button>
      </div>
    </main>
  )
}

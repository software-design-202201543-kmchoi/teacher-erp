import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { getStudents } from "@/lib/api"

export function StudentsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  })

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-muted-foreground">학생 목록 불러오는 중...</p>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
        <p className="text-sm text-destructive">학생 목록을 불러오지 못했습니다.</p>
      </main>
    )
  }

  const students = data?.students ?? []

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">학생 목록</h1>
        <p className="mt-1 text-sm text-muted-foreground">전체 학생 {students.length}명</p>
      </section>

      <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">이름</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">학년</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">반</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">번호</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student._id}
                className="border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => navigate(`/students/${student._id}`)}
              >
                <td className="px-4 py-3 font-medium">{student.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{student.grade}학년</td>
                <td className="px-4 py-3 text-muted-foreground">{student.classId}반</td>
                <td className="px-4 py-3 text-muted-foreground">{student.studentNumber}번</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  등록된 학생이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}

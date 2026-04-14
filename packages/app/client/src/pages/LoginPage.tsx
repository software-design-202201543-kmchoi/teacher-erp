import { useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, type LoginRole } from "@/lib/api"

const roleOptions: Array<{ value: LoginRole; label: string }> = [
  { value: "student", label: "학생" },
  { value: "teacher", label: "교사" },
  { value: "parent", label: "학부모" },
]

const placeholdersByRole: Record<LoginRole, { email: string; password: string }> = {
  student: { email: "student1@school.local", password: "student1234" },
  teacher: { email: "teacher1@school.local", password: "teacher1234" },
  parent: { email: "parent1@school.local", password: "parent1234" },
}

export function LoginPage() {
  const { login } = useAuth()
  const [role, setRole] = useState<LoginRole>("student")
  const [email, setEmail] = useState(placeholdersByRole.student.email)
  const [password, setPassword] = useState(placeholdersByRole.student.password)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const placeholder = useMemo(() => placeholdersByRole[role], [role])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await login(role, email, password)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErrorMessage("이메일 또는 비밀번호가 올바르지 않습니다.")
      } else {
        setErrorMessage("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRoleChange(nextRole: LoginRole) {
    setRole(nextRole)
    setEmail(placeholdersByRole[nextRole].email)
    setPassword(placeholdersByRole[nextRole].password)
    setErrorMessage(null)
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center gap-6 p-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">SD2-30 ~ SD2-32</p>
        <h1 className="mt-2 text-2xl font-semibold">역할별 로그인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          학생/교사/학부모 계정으로 로그인하여 접근 가능한 데이터 범위를 검증합니다.
        </p>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">로그인 역할</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(event) => handleRoleChange(event.target.value as LoginRole)}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">이메일</span>
            <input
              required
              type="email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={email}
              placeholder={placeholder.email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">비밀번호</span>
            <input
              required
              type="password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={password}
              placeholder={placeholder.password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </section>
    </main>
  )
}

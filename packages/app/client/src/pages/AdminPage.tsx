import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import {
  adminGetUsers,
  adminCreateUser,
  adminDeleteUser,
  adminAddParentLink,
  adminRemoveParentLink,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { IUser, IStudentUser, IParentUser, Role, CreateUserInput } from "@teacher-erp/shared-types"

type Tab = "users" | "parent-links"

const ROLE_LABELS: Record<Role, string> = {
  TEACHER: "교사",
  STUDENT: "학생",
  PARENT: "학부모",
}

const ROLE_BADGE: Record<Role, string> = {
  TEACHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  STUDENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  PARENT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
}

const EMPTY_FORM: CreateUserInput = {
  email: "",
  name: "",
  role: "STUDENT",
  password: "",
  grade_level: 1,
  class_num: 1,
  student_num: 1,
  subjects_taught: [],
}

export function AdminPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>("users")
  const [roleFilter, setRoleFilter] = useState<Role | "">("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateUserInput>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<IUser | null>(null)
  const [linkParentId, setLinkParentId] = useState("")
  const [linkStudentId, setLinkStudentId] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter],
    queryFn: () => adminGetUsers(roleFilter ? { role: roleFilter } : undefined),
    enabled: user?.role === "TEACHER",
  })

  const { data: allData } = useQuery({
    queryKey: ["admin-users-all"],
    queryFn: () => adminGetUsers({ limit: 200 }),
    enabled: user?.role === "TEACHER" && activeTab === "parent-links",
  })

  const createMut = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] })
      setShowCreate(false)
      setForm(EMPTY_FORM)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] })
      setDeleteTarget(null)
    },
  })

  const linkMut = useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      adminAddParentLink(parentId, studentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] })
      setLinkParentId("")
      setLinkStudentId("")
    },
  })

  const unlinkMut = useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string; studentId: string }) =>
      adminRemoveParentLink(parentId, studentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-users"] }),
  })

  if (user?.role !== "TEACHER") {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <p className="text-destructive">관리자 페이지는 교사 전용입니다.</p>
      </main>
    )
  }

  const users = data?.users ?? []
  const allUsers = allData?.users ?? []
  const students = allUsers.filter((u): u is IStudentUser => u.role === "STUDENT")
  const parents = allUsers.filter((u): u is IParentUser => u.role === "PARENT")

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">관리자</h1>
      </div>

      {/* 탭 */}
      <nav className="flex gap-1 border-b pb-1">
        {(["users", "parent-links"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "rounded-t px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab === "users" ? "사용자 관리" : "학부모-자녀 연결"}
          </button>
        ))}
      </nav>

      {/* 사용자 관리 탭 */}
      {activeTab === "users" && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["", "TEACHER", "STUDENT", "PARENT"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  roleFilter === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                ].join(" ")}
              >
                {r === "" ? "전체" : ROLE_LABELS[r]}
              </button>
            ))}
            <Button size="sm" className="ml-auto" onClick={() => setShowCreate(true)}>
              + 사용자 추가
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["이름", "이메일", "역할", "기타", "액션"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        사용자가 없습니다.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{u.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {u.role === "STUDENT"
                          ? `${(u as IStudentUser).grade_level}학년 ${(u as IStudentUser).class_num}반 ${(u as IStudentUser).student_num}번`
                          : u.role === "PARENT"
                          ? `자녀 ${(u as IParentUser).children.length}명`
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={u._id === user._id}
                          className="text-xs text-destructive hover:underline disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">전체 {data?.total ?? 0}명</p>
        </section>
      )}

      {/* 학부모-자녀 연결 탭 */}
      {activeTab === "parent-links" && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <h2 className="text-sm font-semibold">새 연결 추가</h2>
            <div className="flex flex-wrap gap-2">
              <select
                value={linkParentId}
                onChange={(e) => setLinkParentId(e.target.value)}
                className="rounded border bg-background px-2 py-1 text-sm"
              >
                <option value="">학부모 선택</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
                ))}
              </select>
              <select
                value={linkStudentId}
                onChange={(e) => setLinkStudentId(e.target.value)}
                className="rounded border bg-background px-2 py-1 text-sm"
              >
                <option value="">학생 선택</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.grade_level}-{s.class_num}-{s.student_num})
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!linkParentId || !linkStudentId || linkMut.isPending}
                onClick={() => linkMut.mutate({ parentId: linkParentId, studentId: linkStudentId })}
              >
                연결
              </Button>
            </div>
            {linkMut.isError && (
              <p className="text-xs text-destructive">연결 실패: {String(linkMut.error)}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">현재 연결 현황</h2>
            {parents.map((p) => (
              <div key={p._id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{p.name} <span className="text-muted-foreground text-xs">({p.email})</span></p>
                {p.children.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">연결된 자녀 없음</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {p.children.map((childId) => {
                      const child = allUsers.find((u) => u._id === childId)
                      return (
                        <li key={childId} className="flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-xs">
                          <span>{child ? `${child.name} (${(child as IStudentUser).grade_level}-${(child as IStudentUser).class_num})` : childId}</span>
                          <button
                            onClick={() => unlinkMut.mutate({ parentId: p._id, studentId: childId })}
                            className="ml-1 text-destructive hover:underline"
                          >
                            ✕
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 사용자 생성 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold">사용자 추가</h2>
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  createMut.mutate(form)
                }}
              >
                <label className="flex flex-col gap-1 text-sm">
                  역할
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...EMPTY_FORM, role: e.target.value as Role })}
                    className="rounded border bg-background px-2 py-1"
                  >
                    <option value="STUDENT">학생</option>
                    <option value="TEACHER">교사</option>
                    <option value="PARENT">학부모</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  이름
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="rounded border bg-background px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  이메일
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="rounded border bg-background px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  임시 비밀번호
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="rounded border bg-background px-2 py-1"
                  />
                </label>
                {form.role === "STUDENT" && (
                  <div className="flex gap-2">
                    {(["grade_level", "class_num", "student_num"] as const).map((f) => (
                      <label key={f} className="flex flex-1 flex-col gap-1 text-sm">
                        {f === "grade_level" ? "학년" : f === "class_num" ? "반" : "번호"}
                        <input
                          required
                          type="number"
                          min={1}
                          value={form[f] ?? 1}
                          onChange={(e) => setForm({ ...form, [f]: Number(e.target.value) })}
                          className="rounded border bg-background px-2 py-1"
                        />
                      </label>
                    ))}
                  </div>
                )}
                {createMut.isError && (
                  <p className="text-xs text-destructive">오류: {String(createMut.error)}</p>
                )}
                <div className="mt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    취소
                  </Button>
                  <Button type="submit" disabled={createMut.isPending}>
                    {createMut.isPending ? "저장 중…" : "저장"}
                  </Button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold">사용자 삭제</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              <strong>{deleteTarget.name}</strong>({deleteTarget.email}) 계정을 삭제합니다.
              관련된 학부모-자녀 연결도 함께 삭제됩니다.
            </p>
            {deleteMut.isError && (
              <p className="mb-2 text-xs text-destructive">오류: {String(deleteMut.error)}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button
                variant="destructive"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget._id)}
              >
                {deleteMut.isPending ? "삭제 중…" : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

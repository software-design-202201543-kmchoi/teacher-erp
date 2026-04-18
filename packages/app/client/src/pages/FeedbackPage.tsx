import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { getFeedback, createFeedback, deleteFeedback } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import type { IFeedback } from "@teacher-erp/shared-types"

const FEEDBACK_TYPES = ["성적", "행동", "출결", "태도"] as const
const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "비공개 (교사만)" },
  { value: "STUDENT", label: "학생 공개" },
  { value: "PARENT", label: "학부모 공개" },
  { value: "ALL", label: "전체 공개" },
] as const

const VISIBILITY_BADGE: Record<string, string> = {
  PRIVATE: "bg-gray-100 text-gray-700",
  STUDENT: "bg-blue-100 text-blue-700",
  PARENT: "bg-green-100 text-green-700",
  ALL: "bg-purple-100 text-purple-700",
}

const VISIBILITY_LABEL: Record<string, string> = {
  PRIVATE: "비공개",
  STUDENT: "학생",
  PARENT: "학부모",
  ALL: "전체",
}

export function FeedbackPage() {
  const { id: studentId = "" } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [type, setType] = useState<string>("성적")
  const [content, setContent] = useState("")
  const [visibility, setVisibility] = useState("PRIVATE")
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)

  const { data: feedbacks = [], isLoading, error } = useQuery({
    queryKey: ["feedback", studentId],
    queryFn: () => getFeedback(studentId),
    enabled: !!studentId,
  })

  const createMutation = useMutation({
    mutationFn: (data: { type: string; content: string; visibility: string }) =>
      createFeedback(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", studentId] })
      setContent("")
      setType("성적")
      setVisibility("PRIVATE")
      setFormError(null)
      setFeedbackModalOpen(false)
    },
    onError: () => setFormError("피드백 작성 중 오류가 발생했습니다."),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFeedback,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback", studentId] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setFormError("내용을 입력하세요.")
      return
    }
    createMutation.mutate({ type, content, visibility })
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${studentId}`)}>
          ← 돌아가기
        </Button>
        <h1 className="text-2xl font-semibold">피드백</h1>
        {user?.role === "TEACHER" && (
          <div className="ml-auto">
            <DialogRoot open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm">피드백 작성</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>피드백 작성</DialogTitle>
                </DialogHeader>
                <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">유형</span>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        {FEEDBACK_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">공개 범위</span>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                      >
                        {VISIBILITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">내용</span>
                    <textarea
                      required
                      rows={3}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="피드백 내용을 입력하세요."
                    />
                  </label>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" size="sm">취소</Button>
                    </DialogClose>
                    <Button type="submit" size="sm" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "저장 중..." : "피드백 저장"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </DialogRoot>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">피드백 불러오는 중...</p>}
      {error && <p className="text-sm text-destructive">피드백을 불러오지 못했습니다.</p>}

      <div className="space-y-3">
        {feedbacks.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">등록된 피드백이 없습니다.</p>
        )}
        {feedbacks.map((fb: IFeedback) => (
          <div key={fb._id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {fb.type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VISIBILITY_BADGE[fb.visibility] ?? ""}`}>
                  {VISIBILITY_LABEL[fb.visibility] ?? fb.visibility}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(fb.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {user?.role === "TEACHER" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(fb._id)}
                >
                  삭제
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm">{fb.content}</p>
          </div>
        ))}
      </div>
    </main>
  )
}

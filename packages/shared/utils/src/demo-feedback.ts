import type { IFeedback } from "@teacher-erp/shared-types"

export const demoFeedback: IFeedback[] = [
  {
    _id: "fb-1",
    student_id: "student-1",
    teacher_id: "teacher-1",
    type: "성적",
    content: "1학기 수학 성적이 크게 향상되었습니다.",
    visibility: "STUDENT",
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
  },
  {
    _id: "fb-2",
    student_id: "student-1",
    teacher_id: "teacher-1",
    type: "행동",
    content: "수업 태도가 매우 모범적입니다.",
    visibility: "ALL",
    createdAt: new Date("2026-04-05"),
    updatedAt: new Date("2026-04-05"),
  },
  {
    _id: "fb-3",
    student_id: "student-1",
    teacher_id: "teacher-1",
    type: "출결",
    content: "무단 결석 1회 발생. 학부모 상담 권고.",
    visibility: "PARENT",
    createdAt: new Date("2026-04-10"),
    updatedAt: new Date("2026-04-10"),
  },
  {
    _id: "fb-4",
    student_id: "student-1",
    teacher_id: "teacher-1",
    type: "태도",
    content: "교사 메모 전용 - 특이 사항 없음.",
    visibility: "PRIVATE",
    createdAt: new Date("2026-04-12"),
    updatedAt: new Date("2026-04-12"),
  },
  {
    _id: "fb-5",
    student_id: "student-2",
    teacher_id: "teacher-1",
    type: "성적",
    content: "영어 과목 집중 지도 필요.",
    visibility: "STUDENT",
    createdAt: new Date("2026-04-03"),
    updatedAt: new Date("2026-04-03"),
  },
]

export const demoFeedbackByStudentId: Record<string, IFeedback[]> = {}
for (const f of demoFeedback) {
  if (!demoFeedbackByStudentId[f.student_id]) demoFeedbackByStudentId[f.student_id] = []
  demoFeedbackByStudentId[f.student_id].push(f)
}

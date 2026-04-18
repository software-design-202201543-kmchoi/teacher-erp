import type { ICounselingRecord } from "@teacher-erp/shared-types"

export const demoCounseling: ICounselingRecord[] = [
  {
    _id: "counsel-1",
    student_id: "student-1",
    teacher_id: "teacher-1",
    counsel_date: new Date("2026-03-15"),
    content: "1학기 초 면담. 학업 스트레스 호소. 집중 관리 계획 수립.",
    next_plan: "2주 후 재면담 예정",
    is_shared: true,
    createdAt: new Date("2026-03-15"),
    updatedAt: new Date("2026-03-15"),
  },
  {
    _id: "counsel-2",
    student_id: "student-1",
    teacher_id: "teacher-1",
    counsel_date: new Date("2026-04-01"),
    content: "재면담. 스트레스 경감. 성적 개선 중.",
    next_plan: undefined,
    is_shared: false,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
  },
  {
    _id: "counsel-3",
    student_id: "student-2",
    teacher_id: "teacher-2",
    counsel_date: new Date("2026-03-20"),
    content: "진로 상담. 이공계 진학 희망.",
    next_plan: "진로 담당 교사 연계",
    is_shared: true,
    createdAt: new Date("2026-03-20"),
    updatedAt: new Date("2026-03-20"),
  },
]

export const demoCounselingByStudentId: Record<string, ICounselingRecord[]> = {}
for (const c of demoCounseling) {
  if (!demoCounselingByStudentId[c.student_id]) demoCounselingByStudentId[c.student_id] = []
  demoCounselingByStudentId[c.student_id].push(c)
}

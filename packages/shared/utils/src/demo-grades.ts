import type { IGrade } from "@teacher-erp/shared-types"

export const demoGrades: IGrade[] = [
  // student-1, teacher-1, 1학기
  { _id: "grade-1", student_id: "student-1", subject_id: "subject-국어", teacher_id: "teacher-1", term: "2026-1", score: 85, calculated_grade: "2", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
  { _id: "grade-2", student_id: "student-1", subject_id: "subject-수학", teacher_id: "teacher-1", term: "2026-1", score: 72, calculated_grade: "3", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
  { _id: "grade-3", student_id: "student-1", subject_id: "subject-영어", teacher_id: "teacher-1", term: "2026-1", score: 91, calculated_grade: "1", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
  { _id: "grade-4", student_id: "student-1", subject_id: "subject-사회", teacher_id: "teacher-1", term: "2026-1", score: 65, calculated_grade: "4", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
  // student-1, teacher-1, 2학기
  { _id: "grade-5", student_id: "student-1", subject_id: "subject-국어", teacher_id: "teacher-1", term: "2026-2", score: 88, calculated_grade: "2", createdAt: new Date("2026-09-01"), updatedAt: new Date("2026-09-01") },
  { _id: "grade-6", student_id: "student-1", subject_id: "subject-수학", teacher_id: "teacher-1", term: "2026-2", score: 76, calculated_grade: "3", createdAt: new Date("2026-09-01"), updatedAt: new Date("2026-09-01") },
  // student-2
  { _id: "grade-7", student_id: "student-2", subject_id: "subject-국어", teacher_id: "teacher-1", term: "2026-1", score: 55, calculated_grade: "5", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
  { _id: "grade-8", student_id: "student-2", subject_id: "subject-수학", teacher_id: "teacher-1", term: "2026-1", score: 42, calculated_grade: "6", createdAt: new Date("2026-03-01"), updatedAt: new Date("2026-03-01") },
]

export const demoGradesByStudentId: Record<string, IGrade[]> = {}
for (const g of demoGrades) {
  if (!demoGradesByStudentId[g.student_id]) demoGradesByStudentId[g.student_id] = []
  demoGradesByStudentId[g.student_id].push(g)
}

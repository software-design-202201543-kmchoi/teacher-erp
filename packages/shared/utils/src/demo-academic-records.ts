import type { IAcademicRecord } from "@teacher-erp/shared-types"

export const demoAcademicRecords: IAcademicRecord[] = [
  {
    _id: "academic-record-1",
    studentId: "student-1",
    attendance_info: {
      absences: 2,
      tardies: 1,
      earlyLeaves: 0,
    },
    special_notes: "성실하고 학습 태도가 우수함. 수학 능력이 특히 뛰어남.",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    _id: "academic-record-2",
    studentId: "student-2",
    attendance_info: {
      absences: 0,
      tardies: 3,
      earlyLeaves: 1,
    },
    special_notes: "예체능 분야에 재능이 있으며 협동심이 강함.",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    _id: "academic-record-3",
    studentId: "student-3",
    attendance_info: {
      absences: 1,
      tardies: 0,
      earlyLeaves: 0,
    },
    special_notes: "독서량이 많고 글쓰기 능력이 뛰어남. 리더십이 돋보임.",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
]

export const demoAcademicRecordsByStudentId = Object.fromEntries(
  demoAcademicRecords.map((record) => [record.studentId, record])
) as Record<string, IAcademicRecord>

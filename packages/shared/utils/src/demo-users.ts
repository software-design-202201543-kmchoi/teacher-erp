import type { IUser } from "@teacher-erp/shared-types"

export const demoUsers: IUser[] = [
  {
    _id: "teacher-1",
    email: "teacher1@school.local",
    name: "담임교사 김선생",
    role: "TEACHER",
    subjectsTaught: ["국어", "수학"],
    homeroom: { grade_level: 1, class_num: 2 },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    _id: "student-1",
    email: "student1@school.local",
    name: "학생 이한결",
    role: "STUDENT",
    grade_level: 1,
    class_num: 2,
    student_num: 12,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    _id: "parent-1",
    email: "parent1@school.local",
    name: "학부모 박보호",
    role: "PARENT",
    children: ["student-1"],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
]

export const demoUsersById = Object.fromEntries(
  demoUsers.map((user) => [user._id, user])
) as Record<string, IUser>
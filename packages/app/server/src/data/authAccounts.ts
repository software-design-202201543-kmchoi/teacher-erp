import type { Role } from "@teacher-erp/shared-types"

export interface DemoAuthAccount {
  role: Role
  email: string
  password: string
  userId: string
}

export const demoAuthAccounts: DemoAuthAccount[] = [
  {
    role: "TEACHER",
    email: "teacher1@school.local",
    password: "teacher1234",
    userId: "teacher-1",
  },
  {
    role: "TEACHER",
    email: "teacher2@school.local",
    password: "teacher2234",
    userId: "teacher-2",
  },
  {
    role: "STUDENT",
    email: "student1@school.local",
    password: "student1234",
    userId: "student-1",
  },
  {
    role: "PARENT",
    email: "parent1@school.local",
    password: "parent1234",
    userId: "parent-1",
  },
]

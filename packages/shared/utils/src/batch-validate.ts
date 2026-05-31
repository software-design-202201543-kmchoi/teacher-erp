import type { BatchStudentInput } from "@teacher-erp/shared-types";

export function validateBatchRow(input: BatchStudentInput): string[] {
  const errors: string[] = [];

  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    errors.push("이름은 필수입니다");
  }

  const gradeLevel = Number(input.grade_level);
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 3) {
    errors.push("학년은 1–3 사이여야 합니다");
  }

  const classNum = Number(input.class_num);
  if (!Number.isInteger(classNum) || classNum < 1 || classNum > 20) {
    errors.push("반은 1–20 사이여야 합니다");
  }

  const studentNum = Number(input.student_num);
  if (!Number.isInteger(studentNum) || studentNum < 1 || studentNum > 50) {
    errors.push("번호는 1–50 사이여야 합니다");
  }

  if (
    input.email !== undefined &&
    input.email !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
  ) {
    errors.push("이메일 형식이 올바르지 않습니다");
  }

  return errors;
}

export function autoGenerateEmail(
  grade_level: number,
  class_num: number,
  student_num: number
): string {
  // 입학년도 = 현재년도 - 학년 + 1 (1학년이면 올해 입학)
  const enrollmentYear = new Date().getFullYear() - grade_level + 1;
  return `${enrollmentYear}${grade_level}${String(class_num).padStart(2, "0")}${String(student_num).padStart(2, "0")}@school.local`;
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

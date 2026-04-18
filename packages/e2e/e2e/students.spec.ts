import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("학생 목록 / 학생부 (SD2-29 ~ SD2-32, Sprint 3) — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 학생 목록 진입 및 학생 상세 이동", async ({ page }) => {
    await page.goto("/students")
    await expect(page.getByRole("heading", { name: /학생 목록/i })).toBeVisible()
    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await expect(page).toHaveURL(/\/students\/student-\d/)
  })

  test("교사: 학생부 출결 수정 및 저장", async ({ page }) => {
    await page.goto("/students/student-1")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const editBtn = page.getByRole("button", { name: "편집" })
    await editBtn.click()
    const attendanceInput = page.locator('input[type="number"]').first()
    await attendanceInput.fill("2")
    await page.getByRole("button", { name: "저장" }).click()
    await expect(page.getByRole("button", { name: "편집" })).toBeVisible()
  })
})

test.describe("학생 목록 / 학생부 (SD2-29 ~ SD2-32, Sprint 3) — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 타인 학생 학생부 페이지 접근 → Forbidden", async ({ page }) => {
    await page.goto("/students")
    await expect(page).toHaveURL(/\/(login|forbidden)/)
  })

  test("학생: 본인 학생 상세 페이지 접근 가능", async ({ page }) => {
    await page.goto("/students/student-1")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})

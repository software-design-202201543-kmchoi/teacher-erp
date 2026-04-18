import { test, expect } from "@playwright/test"

// 교사 세션으로 실행
test.describe("학생 목록 / 학생부 (SD2-29 ~ SD2-32, Sprint 3)", () => {
  test("교사: 학생 목록 진입 및 학생 상세 이동", async ({ page }) => {
    await page.goto("/students")
    await expect(page.getByRole("heading", { name: /학생 목록/i })).toBeVisible()
    // 첫 번째 학생 행 클릭
    const firstRow = page.locator("tbody tr").first()
    await firstRow.click()
    await expect(page).toHaveURL(/\/students\/student-\d/)
  })

  test("교사: 학생부 출결 수정 및 저장", async ({ page }) => {
    await page.goto("/students/student-1")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const editBtn = page.getByRole("button", { name: "편집" })
    await editBtn.click()
    const attendanceTextarea = page.locator("textarea").first()
    await attendanceTextarea.fill("지각 1회, 조퇴 2회")
    await page.getByRole("button", { name: "저장" }).click()
    await expect(page.getByRole("button", { name: "편집" })).toBeVisible()
  })

  test("학생: 타인 학생 학생부 페이지 접근 → Forbidden", async ({ page }) => {
    // student 프로젝트(student storageState)로 실행 — student-2는 본인이 아님
    await page.goto("/students")
    // 학생에게 /students 라우트는 ProtectedRoute(read, Student)로 막힘
    await expect(page).toHaveURL(/\/(login|forbidden)/)
  })
})

// student 프로젝트에서도 실행
test.describe("학생 본인 페이지 접근 (student 세션)", () => {
  test("학생: 본인 학생 상세 페이지 접근 가능", async ({ page }) => {
    await page.goto("/students/student-1")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})

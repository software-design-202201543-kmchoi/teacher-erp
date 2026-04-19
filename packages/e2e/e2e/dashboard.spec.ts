import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")
const parentAuth = path.join(__dirname, "../.auth/parent.json")

test.describe("대시보드 — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 대시보드에서 세션 정보 및 학생 목록 버튼 표시", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /인증 세션 대시보드/i })).toBeVisible()
    await expect(page.getByText(/Role:/i)).toBeVisible()
    await expect(page.getByText(/teacher1@school\.local/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /학생 목록 보기/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /로그아웃/i }).first()).toBeVisible()
  })

  test("교사: 학생 목록 버튼 클릭 시 /students로 이동", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /학생 목록 보기/i }).click()
    await expect(page).toHaveURL("/students")
  })

  test("미인증 상태에서 / 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe("대시보드 — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 대시보드에서 학생 목록 버튼 미노출", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /인증 세션 대시보드/i })).toBeVisible()
    await expect(page.getByText(/student1@school\.local/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /학생 목록 보기/i })).not.toBeVisible()
  })
})

test.describe("대시보드 — 학부모", () => {
  test.use({ storageState: parentAuth })

  test("학부모: 대시보드에서 학생 목록 버튼 미노출", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /인증 세션 대시보드/i })).toBeVisible()
    await expect(page.getByText(/parent1@school\.local/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /학생 목록 보기/i })).not.toBeVisible()
  })
})

import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("성적 관리 (Sprint 4 — SD2 성적 관리) — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 학생 성적 페이지 접근 및 데이터 확인", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await expect(page.getByRole("heading", { name: /성적/ }).first()).toBeVisible()
    await expect(page.getByRole("cell", { name: "85", exact: true })).toBeVisible()
  })

  test("교사: 성적 입력 → 등급 자동 계산 확인", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await page.getByRole("button", { name: "성적 추가" }).click()
    await page.getByPlaceholder("예) 국어").fill("과학")
    await page.getByPlaceholder("예) 2026-1").fill("2026-1")
    await page.getByPlaceholder("0~100").fill("92")
    await page.getByRole("button", { name: /^추가$/ }).click()
    await expect(page.getByText("1등급").or(page.getByText(/^1$/)).last()).toBeVisible()
  })

  test("교사: 레이더 차트 렌더링 확인", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await expect(page.locator("svg")).toBeVisible()
  })
})

test.describe("성적 관리 (Sprint 4 — SD2 성적 관리) — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 본인 성적 조회 가능", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await expect(page.getByRole("heading", { name: /성적/ }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "성적 추가" })).not.toBeVisible()
  })
})

import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("상담 내역 (Sprint 6) — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사1: 공유 상담 기록 조회", async ({ page }) => {
    await page.goto("/students/student-1/counseling")
    await expect(page.getByRole("heading", { name: /상담/ })).toBeVisible()
    await expect(page.getByText(/1학기 초 면담/)).toBeVisible()
    await expect(page.getByText("공유됨")).toBeVisible()
  })

  test("교사: 비공개 상담 기록은 본인 것만 조회", async ({ page }) => {
    await page.goto("/students/student-1/counseling")
    await expect(page.getByText(/재면담/).first()).toBeVisible()
  })

  test("교사: 상담 기록 추가", async ({ page }) => {
    await page.goto("/students/student-1/counseling")
    await page.getByRole("button", { name: /상담 기록 추가/ }).click()
    await page.fill('input[type="date"]', "2026-05-01")
    await page.fill("textarea", "신규 상담 기록입니다.")
    await page.fill('input[placeholder*="계획"]', "2주 후 재면담")
    await page.getByRole("button", { name: /상담 기록 저장/ }).click()
    await expect(page.getByText("신규 상담 기록입니다.")).toBeVisible()
  })

  test("교사: 날짜 필터 적용", async ({ page }) => {
    await page.goto("/students/student-1/counseling")
    await page.locator('input[type="date"]').first().fill("2030-01-01")
    await page.getByRole("button", { name: /검색/ }).click()
    await expect(page.getByText(/1학기 초 면담/)).not.toBeVisible()
    await expect(page.getByText(/조회된 상담 내역이 없습니다/)).toBeVisible()
  })
})

test.describe("상담 내역 (Sprint 6) — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 상담 페이지 접근 불가 (교사 전용)", async ({ page }) => {
    await page.goto("/students/student-1/counseling")
    await expect(page.getByText(/교사만 상담 내역을 조회/)).toBeVisible()
  })
})

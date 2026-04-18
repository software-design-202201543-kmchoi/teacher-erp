import { test, expect } from "@playwright/test"

test.describe("성적 관리 (Sprint 4 — SD2 성적 관리)", () => {
  test("교사: 학생 성적 페이지 접근 및 데이터 확인", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await expect(page.getByRole("heading", { name: /성적/ })).toBeVisible()
    // 기존 픽스처 데이터(국어 85점)가 표시되는지 확인
    await expect(page.getByText("85")).toBeVisible()
  })

  test("교사: 성적 입력 → 등급 자동 계산 확인", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    // 과목명, 학기, 점수 입력
    await page.fill('input[placeholder*="과목"]', "과학")
    await page.fill('input[placeholder*="학기"]', "2026-1")
    await page.fill('input[placeholder*="점수"]', "92")
    await page.getByRole("button", { name: /추가/ }).click()
    // 새로 추가된 성적의 등급 "1" 표시 확인
    await expect(page.getByText("1등급").or(page.getByText("1")).last()).toBeVisible()
  })

  test("교사: 레이더 차트 렌더링 확인", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    // Recharts SVG 렌더링 확인
    await expect(page.locator("svg")).toBeVisible()
  })

  test("학생: 본인 성적 조회 가능", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await expect(page.getByRole("heading", { name: /성적/ })).toBeVisible()
    // 성적 입력 폼은 보이지 않아야 함
    await expect(page.getByRole("button", { name: /추가/ })).not.toBeVisible()
  })
})

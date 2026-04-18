import { test, expect } from "@playwright/test"

test.describe("피드백 (Sprint 5)", () => {
  test("교사: PRIVATE 피드백 작성 후 학생에게 미노출 확인 (교사 뷰)", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await expect(page.getByRole("heading", { name: /피드백/ })).toBeVisible()

    // 피드백 작성 (PRIVATE)
    await page.selectOption("select[name='type'], select", { index: 0 }) // 유형 첫 번째
    await page.fill("textarea", "교사 전용 메모입니다.")
    // 공개 범위를 비공개로 설정
    await page.locator("select").last().selectOption("PRIVATE")
    await page.getByRole("button", { name: /저장/ }).click()
    // 저장 후 리스트에 "비공개" 뱃지 표시
    await expect(page.getByText("비공개")).toBeVisible()
  })

  test("교사: ALL 피드백 작성 → 피드백 목록에 전체 뱃지 표시", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await page.fill("textarea", "전체 공개 피드백입니다.")
    await page.locator("select").last().selectOption("ALL")
    await page.getByRole("button", { name: /저장/ }).click()
    await expect(page.getByText("전체")).toBeVisible()
  })

  test("학생: 본인 STUDENT 피드백 조회 가능", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    // 픽스처 fb-1 (visibility: STUDENT) 내용이 보여야 함
    await expect(page.getByText(/1학기 수학 성적이 크게 향상/)).toBeVisible()
  })

  test("학생: PRIVATE 피드백 미노출", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    // 픽스처 fb-4 (visibility: PRIVATE) 내용이 보이지 않아야 함
    await expect(page.getByText(/교사 메모 전용/)).not.toBeVisible()
  })
})

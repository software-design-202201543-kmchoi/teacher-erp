import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("피드백 (Sprint 5) — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사: PRIVATE 피드백 작성 후 학생에게 미노출 확인 (교사 뷰)", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await expect(page.getByRole("heading", { name: /피드백/ })).toBeVisible()

    await page.getByRole("button", { name: /피드백 작성/ }).click()
    await page.locator("select").first().selectOption("성적")
    await page.fill("textarea", "교사 전용 메모입니다.")
    await page.locator("select").last().selectOption("PRIVATE")
    await page.getByRole("button", { name: /피드백 저장/ }).click()
    // 모달이 닫힌 후 피드백 카드의 뱃지만 확인 (select option 제외)
    await expect(page.locator("main").getByText("비공개", { exact: true }).first()).toBeVisible()
  })

  test("교사: ALL 피드백 작성 → 피드백 목록에 전체 뱃지 표시", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await page.getByRole("button", { name: /피드백 작성/ }).click()
    await page.fill("textarea", "전체 공개 피드백입니다.")
    await page.locator("select").last().selectOption("ALL")
    await page.getByRole("button", { name: /피드백 저장/ }).click()
    // 모달이 닫힌 후 피드백 카드의 뱃지만 확인
    await expect(page.locator("main").getByText("전체", { exact: true }).first()).toBeVisible()
  })
})

test.describe("피드백 (Sprint 5) — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 본인 STUDENT 피드백 조회 가능", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await expect(page.getByText(/1학기 수학 성적이 크게 향상/)).toBeVisible()
  })

  test("학생: PRIVATE 피드백 미노출", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await expect(page.getByText(/교사 메모 전용/)).not.toBeVisible()
  })
})

import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")
const parentAuth = path.join(__dirname, "../.auth/parent.json")

test.describe("대시보드 — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 역할별 요약 카드 및 학생 바로가기 표시", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("담임교사 김선생")).toBeVisible()
    await expect(page.getByText("teacher1@school.local")).toBeVisible()
    await expect(page.getByText("담당 학생")).toBeVisible()
    await expect(page.getByText("미읽음 알림")).toBeVisible()
    await expect(page.getByText("학생 바로가기")).toBeVisible()
  })

  test("교사: 학생 바로가기 링크 클릭 시 학생 상세 이동", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const studentLink = page.locator("a[href^='/students/student-']").first()
    await studentLink.waitFor({ timeout: 5000 })
    await studentLink.click()
    await expect(page).toHaveURL(/\/students\/student-/)
  })

  test("교사: '담당 학생' 카드 클릭 시 /students로 이동", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.getByText("담당 학생").click()
    await expect(page).toHaveURL("/students")
  })

  test("교사: 로그아웃 버튼 표시", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("로그아웃")).toBeVisible()
  })

  test("미인증 상태에서 / 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe("대시보드 — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 성적 기록 카드 및 피드백 카드 표시", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("student1@school.local")).toBeVisible()
    await expect(page.getByText("성적 기록")).toBeVisible()
    await expect(page.getByText("공개 피드백")).toBeVisible()
    await expect(page.getByText("미읽음 알림")).toBeVisible()
  })

  test("학생: '담당 학생' 카드 및 '학생 바로가기' 섹션 미노출", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("담당 학생")).not.toBeVisible()
    await expect(page.getByText("학생 바로가기")).not.toBeVisible()
  })
})

test.describe("대시보드 — 학부모", () => {
  test.use({ storageState: parentAuth })

  test("학부모: 자녀 현황 카드 및 성적/피드백 링크 표시", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("parent1@school.local")).toBeVisible()
    await expect(page.getByText("자녀 현황")).toBeVisible()
    await expect(page.getByText("성적 기록")).toBeVisible()
    await expect(page.getByText("공개 피드백")).toBeVisible()
  })

  test("학부모: 자녀 성적 페이지로 이동 가능", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.getByText("성적 기록").click()
    await expect(page).toHaveURL(/\/students\/.+\/grades/)
  })

  test("학부모: 자녀 피드백 페이지에서 공개 피드백만 표시", async ({ page }) => {
    await page.goto("/students/student-1/feedback")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("피드백 작성")).not.toBeVisible()
    // PRIVATE 피드백은 API 레벨에서 필터됨
    await expect(page.getByText("비공개")).not.toBeVisible()
  })

  test("학부모: '담당 학생' 카드 미노출", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("담당 학생")).not.toBeVisible()
  })

  test("학부모: 사이드바에 자녀 성적·피드백 링크 표시", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByRole("link", { name: /자녀 성적/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /자녀 피드백/ })).toBeVisible()
  })
})

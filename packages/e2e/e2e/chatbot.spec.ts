import { test, expect } from "@playwright/test"

test.describe("AI 챗봇 — 분석 대시보드", () => {
  test("교사: 분석 대시보드에 챗봇 패널이 보인다", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("tab", { name: /교사/i }).click()
    await page.getByLabel(/이메일/i).fill("teacher@school.kr")
    await page.getByLabel(/비밀번호/i).fill("teacher1234")
    await page.getByRole("button", { name: /로그인/i }).click()
    await page.waitForURL("/")

    // 첫 번째 학생의 분석 대시보드로 이동
    await page.goto("/students")
    const firstStudentLink = page.getByRole("link").first()
    const href = await firstStudentLink.getAttribute("href")
    const studentId = href?.split("/students/")[1]?.split("/")[0]
    expect(studentId).toBeTruthy()

    await page.goto(`/students/${studentId}/analytics`)
    await expect(page.getByText("AI 학습 현황 질의")).toBeVisible()
    await expect(page.getByText("Claude 기반")).toBeVisible()
    await expect(page.getByPlaceholder(/질문하세요/i)).toBeVisible()
  })

  test("학생 계정: 챗봇 API 직접 호출 시 403 반환", async ({ request }) => {
    // 학생 로그인
    const loginRes = await request.post("/api/auth/login/student", {
      data: { email: "student@school.kr", password: "student1234" },
    })
    expect(loginRes.ok()).toBeTruthy()

    // 챗봇 API 직접 호출 → 403 예상
    const chatRes = await request.post("/api/analytics/students/some-id/chat", {
      data: { message: "테스트" },
    })
    expect(chatRes.status()).toBe(403)
  })
})

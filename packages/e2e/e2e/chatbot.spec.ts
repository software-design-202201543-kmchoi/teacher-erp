import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("AI 챗봇 — 분석 대시보드 (Sprint 11 — SD2-52~54)", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 분석 대시보드에 챗봇 패널이 표시된다", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await page.waitForLoadState("networkidle")

    const panel = page.getByText("AI 학습 현황 질의")
    await expect(panel).toBeVisible()
    await expect(page.getByText("Gemini 기반")).toBeVisible()
    await expect(page.getByPlaceholder(/질문하세요/i)).toBeVisible()
  })

  test("교사: 챗봇 입력 시 사용자 말풍선이 표시된다", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await page.waitForLoadState("networkidle")

    const input = page.getByPlaceholder(/질문하세요/i)
    await input.fill("이 학생의 취약 과목은?")
    await page.getByRole("button", { name: "전송" }).click()

    await expect(page.getByText("이 학생의 취약 과목은?")).toBeVisible({ timeout: 5000 })
  })

  test("교사: Enter 키로 메시지 전송 가능", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await page.waitForLoadState("networkidle")

    const input = page.getByPlaceholder(/질문하세요/i)
    await input.fill("성적 추세를 알려줘")
    await input.press("Enter")

    await expect(page.getByText("성적 추세를 알려줘")).toBeVisible({ timeout: 5000 })
  })

  test("교사: StudentDetailPage 분석 탭에서 챗봇 패널까지 접근 가능", async ({ page }) => {
    await page.goto("/students/student-1")
    await page.getByRole("link", { name: "분석" }).click()
    await page.waitForURL("**/analytics")
    await expect(page.getByText("AI 학습 현황 질의")).toBeVisible()
  })
})

test.describe("AI 챗봇 — 접근 제어", () => {
  test.use({ storageState: studentAuth })

  test("학생: 분석 대시보드 접근 시 챗봇 패널이 없다 (ProtectedRoute 차단)", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await expect(
      page.getByRole("heading", { name: "접근 권한이 없습니다." }),
    ).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("AI 학습 현황 질의")).not.toBeVisible()
  })
})

test.describe("AI 챗봇 — API 접근 제어", () => {
  test("학생 계정으로 챗봇 API 직접 호출 시 403 반환", async ({ request }) => {
    const loginRes = await request.post("/api/auth/login/student", {
      data: { email: "student1@school.local", password: "student1234" },
    })
    expect(loginRes.ok()).toBeTruthy()

    const chatRes = await request.post("/api/analytics/students/student-1/chat", {
      data: { message: "테스트" },
    })
    expect(chatRes.status()).toBe(403)
  })
})

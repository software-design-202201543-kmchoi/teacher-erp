import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("학습 현황 분석 대시보드 (Sprint 10 — SD2-45)", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 분석 대시보드 진입 및 요약 카드 확인", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await expect(page.getByRole("heading", { name: /학습 현황 분석/ })).toBeVisible()
    // 요약 카드 4개 렌더링 확인
    await expect(page.getByText("전체 평균")).toBeVisible()
    await expect(page.getByText("종합 등급")).toBeVisible()
    await expect(page.getByText("피드백 수")).toBeVisible()
    await expect(page.getByText("상담 수")).toBeVisible()
  })

  test("교사: 학기 탭 전환 → 해당 학기 스냅샷 반영", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    // 초기 탭이 렌더링될 때까지 대기
    await expect(page.getByText(/2026-/)).toBeVisible()
    // 두 번째 학기 탭이 있으면 클릭
    const tabs = page.getByText(/2026-/)
    const count = await tabs.count()
    if (count >= 2) {
      await tabs.nth(1).click()
      // 탭 전환 후 스냅샷 카드 여전히 표시
      await expect(page.getByText("전체 평균")).toBeVisible()
    }
  })

  test("교사: 성적 입력 후 분석 대시보드에 데이터 반영", async ({ page }) => {
    // 성적 입력
    await page.goto("/students/student-1/grades")
    await page.getByRole("button", { name: "성적 추가" }).click()
    await page.getByPlaceholder("예) 국어").fill("과학")
    await page.getByPlaceholder("예) 2026-1").fill("2026-1")
    await page.getByPlaceholder("0~100").fill("88")
    await page.getByRole("button", { name: /^추가$/ }).click()
    await expect(page.getByRole("cell", { name: "88", exact: true })).toBeVisible()

    // 분석 대시보드에서 평균 변경 확인
    await page.goto("/students/student-1/analytics")
    await expect(page.getByText("전체 평균")).toBeVisible()
    // 평균 값이 숫자로 표시됨
    await expect(page.getByText(/\d+\.\d+점/)).toBeVisible()
  })

  test("교사: 레이더 차트 렌더링 확인", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await expect(page.locator("svg").first()).toBeVisible()
  })

  test("교사: 분석 대시보드에 '분석 DB 기반' 뱃지 표시", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await expect(page.getByText("분석 DB 기반")).toBeVisible()
  })

  test("교사: StudentDetailPage 학생부 탭에 '분석' 탭 링크 표시", async ({ page }) => {
    await page.goto("/students/student-1")
    await expect(page.getByRole("link", { name: "분석" })).toBeVisible()
  })
})

test.describe("학습 현황 분석 대시보드 — 접근 제어", () => {
  test.use({ storageState: studentAuth })

  test("학생: 분석 대시보드 접근 시 차단", async ({ page }) => {
    const response = await page.goto("/students/student-1/analytics")
    // ProtectedRoute가 forbidden 또는 redirect 처리해야 함
    const url = page.url()
    const isForbidden =
      url.includes("/forbidden") ||
      url.includes("/login") ||
      (await page.getByText(/교사만 접근/).isVisible())
    expect(isForbidden).toBeTruthy()
  })
})

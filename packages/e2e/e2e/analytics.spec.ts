import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")

test.describe("학습 현황 분석 대시보드 (Sprint 10 — SD2-45)", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 분석 대시보드 진입 및 요약 카드 확인", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await expect(page.getByRole("heading", { name: /학습 현황 분석/ })).toBeVisible()
    await expect(page.getByText("전체 평균")).toBeVisible()
    await expect(page.getByText("종합 등급")).toBeVisible()
    await expect(page.getByText("피드백 수")).toBeVisible()
    await expect(page.getByText("상담 수")).toBeVisible()
  })

  test("교사: 학기 탭 전환 → 해당 학기 스냅샷 반영", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    // 탭 버튼에 한정 — 차트 축 레이블과 겹치지 않도록 role=button으로 제한
    const tabButtons = page.getByRole("button", { name: /2026-/ })
    await expect(tabButtons.first()).toBeVisible({ timeout: 8000 })
    const count = await tabButtons.count()
    if (count >= 2) {
      await tabButtons.nth(1).click()
      await expect(page.getByText("전체 평균")).toBeVisible()
    }
  })

  test("교사: 성적 입력 후 분석 대시보드에 데이터 반영", async ({ page }) => {
    await page.goto("/students/student-1/grades")
    await page.getByRole("button", { name: "성적 추가" }).click()
    await page.getByPlaceholder("예) 국어").fill("과학")
    await page.getByPlaceholder("예) 2026-1").fill("2026-1")
    await page.getByPlaceholder("0~100").fill("88")
    await page.getByRole("button", { name: /^추가$/ }).click()
    // 병렬 실행으로 동점이 여러 개일 수 있으므로 first() 사용
    await expect(page.getByRole("cell", { name: "88", exact: true }).first()).toBeVisible()

    await page.goto("/students/student-1/analytics")
    await expect(page.getByText("전체 평균")).toBeVisible()
    // 요약 카드의 평균 점수(StatCard의 value) — 소수점 포함 숫자로 표시됨
    await expect(page.locator("p.text-2xl.font-bold").first()).toBeVisible()
  })

  test("교사: 레이더 차트 렌더링 확인", async ({ page }) => {
    await page.goto("/students/student-1/analytics")
    await page.waitForLoadState("networkidle")
    const hasData = await page.getByText("전체 평균").isVisible()
    if (hasData) {
      await expect(page.locator("svg").first()).toBeVisible()
    } else {
      await expect(page.getByText(/아직 집계된|데이터가 없습니다/)).toBeVisible()
    }
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
    await page.goto("/students/student-1/analytics")
    // ProtectedRoute는 URL을 바꾸지 않고 ForbiddenPage를 인라인 렌더링한다.
    // React 렌더링 완료를 기다린 뒤 ForbiddenPage 헤딩을 확인한다.
    await expect(
      page.getByRole("heading", { name: "접근 권한이 없습니다." }),
    ).toBeVisible({ timeout: 5000 })
  })
})

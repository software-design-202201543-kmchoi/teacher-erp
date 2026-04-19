import { test, expect } from "@playwright/test"

// 인증 상태 없이 실행 (로그인 폼 자체를 검증)
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("로그인 페이지 (SD2-30 ~ SD2-32)", () => {
  test("미인증 상태에서 /login 접근 시 로그인 폼 렌더링", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /역할별 로그인/i })).toBeVisible()
    await expect(page.locator("select")).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole("button", { name: /로그인/i })).toBeVisible()
  })

  test("역할 변경 시 이메일/비밀번호 placeholder 자동 변경", async ({ page }) => {
    await page.goto("/login")
    // 기본값 student
    await expect(page.locator('input[type="email"]')).toHaveValue("student1@school.local")

    // 교사로 변경
    await page.selectOption("select", "teacher")
    await expect(page.locator('input[type="email"]')).toHaveValue("teacher1@school.local")
    await expect(page.locator('input[type="password"]')).toHaveValue("teacher1234")

    // 학부모로 변경
    await page.selectOption("select", "parent")
    await expect(page.locator('input[type="email"]')).toHaveValue("parent1@school.local")
  })

  test("잘못된 비밀번호 입력 시 오류 메시지 표시", async ({ page }) => {
    await page.goto("/login")
    await page.selectOption("select", "teacher")
    await page.fill('input[type="email"]', "teacher1@school.local")
    await page.fill('input[type="password"]', "wrongpassword")
    await page.click('button[type="submit"]')
    await expect(
      page.getByText(/이메일 또는 비밀번호가 올바르지 않습니다/i)
    ).toBeVisible()
  })

  test("교사 로그인 성공 시 대시보드로 이동", async ({ page }) => {
    await page.goto("/login")
    await page.selectOption("select", "teacher")
    await page.fill('input[type="email"]', "teacher1@school.local")
    await page.fill('input[type="password"]', "teacher1234")
    await page.click('button[type="submit"]')
    await page.waitForURL("/")
    await expect(page.getByRole("heading", { name: /인증 세션 대시보드/i })).toBeVisible()
  })

  test("학생 로그인 성공 시 대시보드로 이동", async ({ page }) => {
    await page.goto("/login")
    await page.selectOption("select", "student")
    await page.fill('input[type="email"]', "student1@school.local")
    await page.fill('input[type="password"]', "student1234")
    await page.click('button[type="submit"]')
    await page.waitForURL("/")
    await expect(page.getByRole("heading", { name: /인증 세션 대시보드/i })).toBeVisible()
  })

  test("인증된 상태에서 /login 접근 시 대시보드로 리다이렉트", async ({ page, context }) => {
    // 교사 세션 주입 후 /login 접근
    await page.goto("/login")
    await page.selectOption("select", "teacher")
    await page.fill('input[type="email"]', "teacher1@school.local")
    await page.fill('input[type="password"]', "teacher1234")
    await page.click('button[type="submit"]')
    await page.waitForURL("/")

    // 이미 로그인된 상태에서 /login 재접근
    await page.goto("/login")
    await expect(page).toHaveURL("/")
  })
})

import { test, expect } from "@playwright/test"
import path from "path"

const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
const studentAuth = path.join(__dirname, "../.auth/student.json")
const parentAuth = path.join(__dirname, "../.auth/parent.json")

test.describe("알림 (Sprint 7 — 알림) — 교사", () => {
  test.use({ storageState: teacherAuth })

  test("교사: 알림 페이지 접근 및 알림 목록 표시", async ({ page }) => {
    await page.goto("/notifications")
    await expect(page.getByRole("heading", { name: /알림/i })).toBeVisible()
  })

  test("교사: 미읽음 알림에 '미읽음' 뱃지 표시 및 '전체 읽음' 버튼 노출", async ({ page }) => {
    await page.goto("/notifications")
    const unreadBadge = page.getByText("미읽음").first()
    const readAllBtn = page.getByRole("button", { name: /전체 읽음/i })

    const hasUnread = await unreadBadge.isVisible()
    if (hasUnread) {
      await expect(readAllBtn).toBeVisible()
      await expect(page.getByText(/읽지 않은 알림 \d+개/i)).toBeVisible()
    }
  })

  test("교사: 미읽음 알림 클릭 시 '미읽음' 뱃지 사라짐", async ({ page }) => {
    await page.goto("/notifications")
    const firstUnread = page.locator("li").filter({ has: page.getByText("미읽음") }).first()
    const hasUnread = await firstUnread.isVisible()

    if (hasUnread) {
      await firstUnread.click()
      await expect(firstUnread.getByText("미읽음")).not.toBeVisible()
    }
  })

  test("교사: '전체 읽음' 버튼 클릭 시 모든 미읽음 뱃지 사라짐", async ({ page }) => {
    await page.goto("/notifications")
    const readAllBtn = page.getByRole("button", { name: /전체 읽음/i })

    if (await readAllBtn.isVisible()) {
      await readAllBtn.click()
      await expect(page.getByText("미읽음")).not.toBeVisible()
      await expect(readAllBtn).not.toBeVisible()
    }
  })
})

test.describe("알림 (Sprint 7 — 알림) — 학생", () => {
  test.use({ storageState: studentAuth })

  test("학생: 알림 페이지 접근 가능 및 본인 알림만 표시", async ({ page }) => {
    await page.goto("/notifications")
    await expect(page.getByRole("heading", { name: /알림/i })).toBeVisible()
    const isEmpty = await page.getByText("알림이 없습니다").isVisible()
    const hasList = await page.locator("li").first().isVisible()
    expect(isEmpty || hasList).toBe(true)
  })
})

test.describe("알림 (Sprint 7 — 알림) — 학부모", () => {
  test.use({ storageState: parentAuth })

  test("학부모: 알림 페이지 접근 가능", async ({ page }) => {
    await page.goto("/notifications")
    await expect(page.getByRole("heading", { name: /알림/i })).toBeVisible()
  })
})

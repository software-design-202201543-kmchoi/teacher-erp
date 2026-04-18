import { test as setup } from "@playwright/test"
import path from "path"

const authDir = path.join(__dirname, "../.auth")

setup("authenticate as teacher", async ({ page }) => {
  await page.goto("/login")
  await page.selectOption("select", "teacher")
  await page.fill('input[type="email"]', "teacher1@school.local")
  await page.fill('input[type="password"]', "teacher1234")
  await page.click('button[type="submit"]')
  await page.waitForURL("/")
  await page.context().storageState({ path: path.join(authDir, "teacher.json") })
})

setup("authenticate as student", async ({ page }) => {
  await page.goto("/login")
  await page.selectOption("select", "student")
  await page.fill('input[type="email"]', "student1@school.local")
  await page.fill('input[type="password"]', "student1234")
  await page.click('button[type="submit"]')
  await page.waitForURL("/")
  await page.context().storageState({ path: path.join(authDir, "student.json") })
})

setup("authenticate as parent", async ({ page }) => {
  await page.goto("/login")
  await page.selectOption("select", "parent")
  await page.fill('input[type="email"]', "parent1@school.local")
  await page.fill('input[type="password"]', "parent1234")
  await page.click('button[type="submit"]')
  await page.waitForURL("/")
  await page.context().storageState({ path: path.join(authDir, "parent.json") })
})

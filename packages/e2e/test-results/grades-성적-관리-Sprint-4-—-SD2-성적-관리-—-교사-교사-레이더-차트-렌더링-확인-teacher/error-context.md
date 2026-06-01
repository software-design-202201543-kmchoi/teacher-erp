# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: grades.spec.ts >> 성적 관리 (Sprint 4 — SD2 성적 관리) — 교사 >> 교사: 레이더 차트 렌더링 확인
- Location: e2e/grades.spec.ts:26:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('svg')
Expected: visible
Error: strict mode violation: locator('svg') resolved to 8 elements:
    1) <svg width="16" height="16" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house" xmlns="http://www.w3.org/2000/svg">…</svg> aka getByRole('link', { name: '대시보드' })
    2) <svg width="16" height="16" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users" xmlns="http://www.w3.org/2000/svg">…</svg> aka getByRole('link', { name: '학생 목록' })
    3) <svg width="16" height="16" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell" xmlns="http://www.w3.org/2000/svg">…</svg> aka getByRole('link', { name: '알림' })
    4) <svg width="16" height="16" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out" xmlns="http://www.w3.org/2000/svg">…</svg> aka getByRole('button', { name: '로그아웃' })
    5) <svg width="20" height="20" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell" xmlns="http://www.w3.org/2000/svg">…</svg> aka locator('header svg')
    6) <svg width="20" height="20" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house" xmlns="http://www.w3.org/2000/svg">…</svg> aka locator('svg').nth(5)
    7) <svg width="20" height="20" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users" xmlns="http://www.w3.org/2000/svg">…</svg> aka locator('.flex.flex-1.flex-col.items-center.gap-0\\.5.py-2.text-xs.text-primary > .lucide')
    8) <svg width="20" height="20" fill="none" stroke-width="2" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell" xmlns="http://www.w3.org/2000/svg">…</svg> aka locator('.relative > .relative > .lucide')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('svg')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - text: 학생 관리 시스템
      - paragraph [ref=e6]: 담임교사 김선생
    - navigation [ref=e7]:
      - link "대시보드" [ref=e8] [cursor=pointer]:
        - /url: /
        - img [ref=e9]
        - generic [ref=e12]: 대시보드
      - link "학생 목록" [ref=e13] [cursor=pointer]:
        - /url: /students
        - img [ref=e14]
        - generic [ref=e19]: 학생 목록
    - generic [ref=e20]:
      - link "알림" [ref=e21] [cursor=pointer]:
        - /url: /notifications
        - generic [ref=e22]:
          - img [ref=e23]
          - generic [ref=e26]: 알림
      - button "로그아웃" [ref=e27]:
        - img [ref=e28]
        - generic [ref=e31]: 로그아웃
  - main [ref=e33]:
    - main [ref=e34]:
      - generic [ref=e35]:
        - button "← 뒤로가기" [ref=e36]
        - heading "학생 성적 관리" [level=1] [ref=e37]
        - button "성적 추가" [ref=e39]
      - generic [ref=e40]:
        - button "전체" [ref=e41]
        - button "2026-1" [ref=e42]
        - button "2026-2" [ref=e43]
      - table [ref=e46]:
        - rowgroup [ref=e47]:
          - row "과목 학기 점수 등급 관리" [ref=e48]:
            - columnheader "과목" [ref=e49]
            - columnheader "학기" [ref=e50]
            - columnheader "점수" [ref=e51]
            - columnheader "등급" [ref=e52]
            - columnheader "관리" [ref=e53]
        - rowgroup [ref=e54]:
          - row "국어 2026-1 85 2등급 수정 삭제" [ref=e55]:
            - cell "국어" [ref=e56]
            - cell "2026-1" [ref=e57]
            - cell "85" [ref=e58]
            - cell "2등급" [ref=e59]:
              - generic [ref=e60]: 2등급
            - cell "수정 삭제" [ref=e61]:
              - generic [ref=e62]:
                - button "수정" [ref=e63]
                - button "삭제" [ref=e64]
          - row "수학 2026-1 72 3등급 수정 삭제" [ref=e65]:
            - cell "수학" [ref=e66]
            - cell "2026-1" [ref=e67]
            - cell "72" [ref=e68]
            - cell "3등급" [ref=e69]:
              - generic [ref=e70]: 3등급
            - cell "수정 삭제" [ref=e71]:
              - generic [ref=e72]:
                - button "수정" [ref=e73]
                - button "삭제" [ref=e74]
          - row "영어 2026-1 91 1등급 수정 삭제" [ref=e75]:
            - cell "영어" [ref=e76]
            - cell "2026-1" [ref=e77]
            - cell "91" [ref=e78]
            - cell "1등급" [ref=e79]:
              - generic [ref=e80]: 1등급
            - cell "수정 삭제" [ref=e81]:
              - generic [ref=e82]:
                - button "수정" [ref=e83]
                - button "삭제" [ref=e84]
          - row "사회 2026-1 65 4등급 수정 삭제" [ref=e85]:
            - cell "사회" [ref=e86]
            - cell "2026-1" [ref=e87]
            - cell "65" [ref=e88]
            - cell "4등급" [ref=e89]:
              - generic [ref=e90]: 4등급
            - cell "수정 삭제" [ref=e91]:
              - generic [ref=e92]:
                - button "수정" [ref=e93]
                - button "삭제" [ref=e94]
          - row "국어 2026-2 88 2등급 수정 삭제" [ref=e95]:
            - cell "국어" [ref=e96]
            - cell "2026-2" [ref=e97]
            - cell "88" [ref=e98]
            - cell "2등급" [ref=e99]:
              - generic [ref=e100]: 2등급
            - cell "수정 삭제" [ref=e101]:
              - generic [ref=e102]:
                - button "수정" [ref=e103]
                - button "삭제" [ref=e104]
          - row "수학 2026-2 76 3등급 수정 삭제" [ref=e105]:
            - cell "수학" [ref=e106]
            - cell "2026-2" [ref=e107]
            - cell "76" [ref=e108]
            - cell "3등급" [ref=e109]:
              - generic [ref=e110]: 3등급
            - cell "수정 삭제" [ref=e111]:
              - generic [ref=e112]:
                - button "수정" [ref=e113]
                - button "삭제" [ref=e114]
        - rowgroup [ref=e115]:
          - 'row "총점: 477평균: 79.50종합 등급: 3등급" [ref=e116]':
            - 'cell "총점: 477평균: 79.50종합 등급: 3등급" [ref=e117]':
              - generic [ref=e118]: "총점: 477"
              - generic [ref=e119]: "평균: 79.50"
              - generic [ref=e120]: "종합 등급: 3등급"
      - generic [ref=e121]:
        - heading "과목별 성적 분포" [level=2] [ref=e122]
        - img [ref=e125]:
          - generic [ref=e139]:
            - generic [ref=e141]: 국어
            - generic [ref=e144]: 수학
            - generic [ref=e147]: 영어
            - generic [ref=e149]: 사회
            - generic [ref=e152]: 국어
            - generic [ref=e155]: 수학
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | import path from "path"
  3  | 
  4  | const teacherAuth = path.join(__dirname, "../.auth/teacher.json")
  5  | const studentAuth = path.join(__dirname, "../.auth/student.json")
  6  | 
  7  | test.describe("성적 관리 (Sprint 4 — SD2 성적 관리) — 교사", () => {
  8  |   test.use({ storageState: teacherAuth })
  9  | 
  10 |   test("교사: 학생 성적 페이지 접근 및 데이터 확인", async ({ page }) => {
  11 |     await page.goto("/students/student-1/grades")
  12 |     await expect(page.getByRole("heading", { name: /성적/ }).first()).toBeVisible()
  13 |     await expect(page.getByRole("cell", { name: "85", exact: true })).toBeVisible()
  14 |   })
  15 | 
  16 |   test("교사: 성적 입력 → 등급 자동 계산 확인", async ({ page }) => {
  17 |     await page.goto("/students/student-1/grades")
  18 |     await page.getByRole("button", { name: "성적 추가" }).click()
  19 |     await page.getByPlaceholder("예) 국어").fill("과학")
  20 |     await page.getByPlaceholder("예) 2026-1").fill("2026-1")
  21 |     await page.getByPlaceholder("0~100").fill("92")
  22 |     await page.getByRole("button", { name: /^추가$/ }).click()
  23 |     await expect(page.getByText("1등급").or(page.getByText(/^1$/)).last()).toBeVisible()
  24 |   })
  25 | 
  26 |   test("교사: 레이더 차트 렌더링 확인", async ({ page }) => {
  27 |     await page.goto("/students/student-1/grades")
> 28 |     await expect(page.locator("svg")).toBeVisible()
     |                                       ^ Error: expect(locator).toBeVisible() failed
  29 |   })
  30 | })
  31 | 
  32 | test.describe("성적 관리 (Sprint 4 — SD2 성적 관리) — 학생", () => {
  33 |   test.use({ storageState: studentAuth })
  34 | 
  35 |   test("학생: 본인 성적 조회 가능", async ({ page }) => {
  36 |     await page.goto("/students/student-1/grades")
  37 |     await expect(page.getByRole("heading", { name: /성적/ }).first()).toBeVisible()
  38 |     await expect(page.getByRole("button", { name: "성적 추가" })).not.toBeVisible()
  39 |   })
  40 | })
  41 | 
```
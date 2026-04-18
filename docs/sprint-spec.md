# Teacher ERP — 초안 완성 스프린트 스펙

## 컨텍스트

- 스택: Express(서버), React + TanStack Query + Zustand(클라이언트), Tailwind + shadcn/ui, MongoDB + Mongoose, pnpm monorepo
- 인증/RBAC(CASL) 스프린트는 완료됨. JWT 쿠키 세션, 교사/학생/학부모 역할별 ability 정의 완비.
- 공유 패키지: `@teacher-erp/shared-types`(도메인 인터페이스), `@teacher-erp/shared-db`(Mongoose 스키마), `@teacher-erp/shared-utils`(ability, demo-users)
- 기존 서버 라우트: `/api/auth/*`, `/api/grades` (stub), `/api/counseling` (stub)
- 기존 클라이언트 페이지: LoginPage, DashboardPage, ForbiddenPage
- 요구사항 원문: `docs/requirements.md`

## 완료 정의

각 스프린트 태스크는 다음 기준을 충족해야 완료로 간주한다:
1. TypeScript 컴파일 에러 없음 (`tsc --noEmit`)
2. ESLint 경고 없음
3. 핵심 happy-path 동작 확인
4. Playwright E2E 시나리오 파일 작성 (실행 가능 여부 무관, 시나리오 코드 존재)

---

## Sprint 3: 학생 기본 정보 / 학생부 API + UI

### 배경
교사가 담당 학생 목록을 조회하고 학생부(기본 정보, 출결, 특기사항)를 열람·수정할 수 있어야 한다.

### 태스크

#### 3-A: 학생 목록/상세 API (서버)
- `GET /api/students` — TEACHER만 접근, 전체 학생 목록 반환
- `GET /api/students/:id` — TEACHER·해당 STUDENT·해당 PARENT 접근, 학생 상세
- `GET /api/students/:id/academic-record` — AcademicRecord 조회
- `PUT /api/students/:id/academic-record` — TEACHER만 수정 (attendance_info, special_notes)
- 모든 라우트에 `authenticate → authorize` 미들웨어 적용
- demoStudents 픽스처 데이터 추가 (2~3명)

#### 3-B: 학생 목록 페이지 (클라이언트)
- `/students` 페이지 — TEACHER 전용 (ProtectedRoute)
- TanStack Query로 `/api/students` 조회
- shadcn/ui Table 컴포넌트로 이름/학년/반/번호 표시
- 행 클릭 시 `/students/:id` 이동

#### 3-C: 학생 상세/학생부 페이지 (클라이언트)
- `/students/:id` 페이지
- 학생 기본 정보 카드 (이름, 학년, 반, 번호)
- 학생부 카드 (출결, 특기사항) — TEACHER는 인라인 편집 가능
- 편집 저장 시 PUT 호출, 성공 시 Query invalidate

#### 3-D: E2E 시나리오 (Playwright)
- `e2e/students.spec.ts` 작성
- 교사 로그인 → 학생 목록 진입 → 특정 학생 클릭 → 학생부 수정 → 저장 확인
- 학생 계정으로 타인 학생 페이지 접근 시 403/forbidden 리다이렉트 확인

---

## Sprint 4: 성적 관리 API + UI

### 배경
교사가 학기별/과목별 성적을 입력·수정하고, 총점/평균/등급이 자동 계산되며, 레이더 차트로 시각화된다.

### 태스크

#### 4-A: 성적 도메인 로직 (shared-utils)
- `packages/shared/utils/src/grade-calc.ts` 신규
  - `calcAverage(scores: number[]): number`
  - `calcGrade(average: number): string` (9등급제: 1~9, 경계 상수 정의)
  - 두 함수 모두 export

#### 4-B: 성적 API (서버)
- `GET /api/students/:id/grades` — TEACHER·해당 STUDENT·해당 PARENT 접근
- `POST /api/students/:id/grades` — TEACHER만, body: { subject_id, term, score }
- `PUT /api/grades/:gradeId` — 담당 TEACHER만 (teacher_id 일치 확인)
- `DELETE /api/grades/:gradeId` — 담당 TEACHER만
- POST/PUT 핸들러에서 `calcGrade` 호출해 `calculated_grade` 저장
- demoGrades 픽스처 (학생 1명, 3~4과목, 2학기)

#### 4-C: 성적 관리 UI (클라이언트)
- `/students/:id/grades` 페이지
- 학기 탭 (1학기/2학기) + 과목별 성적 테이블
- 성적 입력 폼 (과목 선택, 점수 입력) — 교사만 표시
- 총점·평균·등급 자동 표시 (클라이언트 계산, `calcAverage`·`calcGrade` import)
- Recharts `RadarChart`로 과목별 점수 시각화

#### 4-D: E2E 시나리오 (Playwright)
- `e2e/grades.spec.ts`
- 교사 로그인 → 학생 성적 페이지 → 성적 입력 → 등급 자동 계산 확인
- 학생 로그인 → 본인 성적 조회 → 타 학생 성적 접근 차단 확인

---

## Sprint 5: 피드백 API + UI

### 배경
교사가 학생별 피드백을 작성(성적/행동/출결/태도)하고 학생·학부모 공개 여부를 설정한다.

### 태스크

#### 5-A: 피드백 API (서버)
- `GET /api/students/:id/feedback` — 역할별 visibility 필터 적용
  - TEACHER: 전체
  - STUDENT: visibility IN [STUDENT, ALL]이고 student_id 일치
  - PARENT: visibility IN [PARENT, ALL]이고 student_id가 자녀 중 하나
- `POST /api/students/:id/feedback` — TEACHER만, body: { type, content, visibility }
- `PUT /api/feedback/:feedbackId` — 작성 TEACHER만
- `DELETE /api/feedback/:feedbackId` — 작성 TEACHER만
- demoFeedback 픽스처

#### 5-B: 피드백 UI (클라이언트)
- `/students/:id/feedback` 페이지
- 피드백 목록 카드 (유형 뱃지, 날짜, 내용, 공개 범위 표시)
- 피드백 작성 폼 (교사만) — 유형 select, 내용 textarea, 공개 범위 select
- 학생/학부모는 공개된 피드백만 렌더링

#### 5-C: E2E 시나리오
- `e2e/feedback.spec.ts`
- 교사 → 피드백 작성 (PRIVATE) → 학생 로그인 → 해당 피드백 미노출 확인
- 교사 → 피드백 공개 범위 STUDENT로 변경 → 학생 로그인 → 노출 확인

---

## Sprint 6: 상담 내역 API + UI

### 배경
교사가 상담 기록을 작성하고 다른 교사와 공유할 수 있다. 날짜/키워드 필터링 지원.

### 태스크

#### 6-A: 상담 API (서버)
- `GET /api/students/:id/counseling` — TEACHER (is_shared=true이거나 teacher_id 일치)
- `POST /api/students/:id/counseling` — TEACHER만
- `PUT /api/counseling/:recordId` — 작성 TEACHER만
- 쿼리 파라미터: `?from=YYYY-MM-DD&to=YYYY-MM-DD&keyword=텍스트`
- demoCounseling 픽스처

#### 6-B: 상담 UI (클라이언트)
- `/students/:id/counseling` 페이지
- 상담 목록 (날짜, 내용 요약, 공유 여부 뱃지)
- 날짜 범위 + 키워드 필터 폼
- 상담 작성 폼 (날짜, 내용, 후속 계획, 공유 여부 토글)

#### 6-C: E2E 시나리오
- `e2e/counseling.spec.ts`
- 교사1 상담 작성(공유=true) → 교사2 로그인 → 공유 상담 확인
- 날짜 필터 적용 → 범위 외 기록 미노출 확인

---

## Sprint 7: 네비게이션 + 레이아웃 통합

### 태스크

#### 7-A: AppShell 레이아웃
- `AppShell` 컴포넌트: 사이드바(데스크톱) + 하단 탭바(모바일)
- 역할별 메뉴 항목: TEACHER(학생 목록, 성적, 피드백, 상담), STUDENT/PARENT(본인 성적, 피드백)
- `ability.can()` 기반 메뉴 항목 가시성 제어

#### 7-B: 라우팅 통합
- App.tsx 라우트 트리 정리: 인증 필요 라우트를 `AppShell` 내부로 이동
- 학생 상세 하위 탭 네비게이션 (학생부 / 성적 / 피드백 / 상담)
- 404 Not Found 페이지 추가

#### 7-C: E2E 시나리오
- `e2e/navigation.spec.ts`
- 모바일 뷰포트에서 탭바 동작 확인
- 역할별 메뉴 항목 가시성 확인

---

## Sprint 8: 알림 API + UI

### 배경
성적 입력, 피드백 작성, 상담 업데이트 시 해당 학생/학부모에게 알림이 생성된다.

### 태스크

#### 8-A: 알림 생성 로직 (서버)
- `packages/app/server/src/utils/createNotification.ts`
- 성적 POST 성공 후 해당 학생·학부모에게 알림 생성
- 피드백 POST 성공 후 visibility에 따라 알림 생성
- `GET /api/notifications` — 본인 알림 목록 (최신순, 미읽음 우선)
- `POST /api/notifications/:id/read` — 읽음 처리

#### 8-B: 알림 UI (클라이언트)
- 헤더 알림 아이콘 + 미읽음 뱃지
- 알림 드롭다운 목록 (최대 10개)
- 전체 알림 페이지 `/notifications`

---

## Sprint 9: 코드 품질 + 린트 + E2E 인프라

### 태스크

#### 9-A: ESLint + TypeScript 설정 통합
- 루트 `eslint.config.js` (flat config) 설정
- `packages/app/client`, `packages/app/server`, `packages/shared/*` 모두 커버
- `@typescript-eslint/recommended`, `react-hooks/recommended` 규칙 포함
- `pnpm lint` 스크립트 추가 (루트 + 각 패키지)

#### 9-B: Playwright E2E 인프라
- `packages/e2e/` 패키지 신규
- `playwright.config.ts` 설정 (baseURL, 역할별 storageState 셋업)
- `e2e/auth.setup.ts` — 교사/학생/학부모 로그인 후 storageState 저장
- Sprint 3~8 시나리오 파일 통합
- `pnpm test:e2e` 스크립트

#### 9-C: pnpm 스크립트 정리
- 루트 `package.json`에 `build`, `dev`, `lint`, `test:e2e` 스크립트
- 각 앱 패키지에 `dev`, `build` 스크립트 확인/추가

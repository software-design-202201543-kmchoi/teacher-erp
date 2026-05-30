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

---

## Sprint 10: OLAP 파이프라인 + 분석 대시보드

### 배경
운영 DB의 성적·피드백·상담·출결 데이터를 분석용 컬렉션으로 집계하여, 교사가 학생별·과목별 학습 현황을 대시보드에서 조회할 수 있어야 한다.
MongoDB Change Streams를 이벤트 소스로 활용해 이벤트 기반 실시간 갱신을 구현하고, 배치 cron으로 보정 집계를 병행한다.

### 태스크

#### 10-A: 분석 스키마 확정 (shared-db)
- `StudentLearningSnapshot`, `SubjectProgressSummary` 스키마 (`packages/shared/db/src/schemas/`) — 이미 추가됨
- 두 모델을 `shared-db` index에서 export

#### 10-B: OLAP 파이프라인 워커 (서버)
- `packages/app/server/src/workers/olap-pipeline.ts` 신규
- **Change Streams 리스너**: MongoDB Change Streams로 `grades`, `feedbacks`, `counselingrecords`, `academicrecords` 컬렉션 변경 감지
  - `insert` / `update` / `replace` 이벤트 발생 시 해당 `student_id` + `term` 스냅샷을 즉시 재집계·upsert
- **집계 함수** `aggregateStudentSnapshot(studentId, term)`:
  - 해당 학기 성적 목록 → `avg_score`, `overall_grade`, `subject_scores` 계산 (`calcAverage`, `calcGrade` 재사용)
  - 피드백 count, 상담 count, 출결 요약 수집
  - `StudentLearningSnapshot` upsert
- **집계 함수** `aggregateSubjectSummary(studentId, subjectId)`:
  - 전 학기 점수 이력 → `score_history`, `avg_score`, `trend` 계산
  - `SubjectProgressSummary` upsert
- 워커는 서버 시작 시 `startOlapPipeline()` 호출로 Change Streams 구독 시작
- **배치 cron** (`node-cron`): 매일 새벽 2시 전체 학생에 대해 전체 학기 재집계 실행 (누락 보정)

#### 10-C: 분석 API (서버)
- `GET /api/analytics/students/:id/snapshot?term=2024-1` — `StudentLearningSnapshot` 조회 (TEACHER만)
- `GET /api/analytics/students/:id/subject-progress` — 전 과목 `SubjectProgressSummary` 배열 조회 (TEACHER만)
- 두 엔드포인트 모두 분석 컬렉션에서만 읽고 운영 컬렉션에 직접 쿼리하지 않음

#### 10-D: 분석 대시보드 UI (클라이언트)
- `/students/:id/analytics` 페이지 (TEACHER 전용)
- **요약 카드 행**: 전체 평균 점수, 종합 등급, 피드백 수, 상담 수
- **레이더 차트** (Recharts `RadarChart`): 과목별 점수 (`subject_scores` 기반) — Sprint 4 컴포넌트 재활용
- **선 차트** (`LineChart`): 과목별 점수 추세 (`score_history` 기반)
- 학기 선택 탭: 탭 변경 시 TanStack Query `term` 쿼리 파라미터 갱신
- 로딩 상태: shadcn/ui `Skeleton` 컴포넌트

#### 10-E: E2E 시나리오 (Playwright)
- `e2e/analytics.spec.ts`
- 교사 로그인 → 성적 입력 → 분석 대시보드 진입 → 스냅샷 데이터 반영 확인
- 학생 계정으로 `/students/:id/analytics` 접근 시 403 확인

---

## Sprint 11: AI 챗봇 (선택)

### 배경
분석 컬렉션에 집계된 학생별 학습 요약 데이터를 컨텍스트로 Claude API를 호출하여 교사가 자연어로 학생 현황을 질의할 수 있다.

### 태스크

#### 11-A: 챗봇 API (서버)
- `POST /api/analytics/students/:id/chat` — TEACHER만, body: `{ message: string }`
- 핸들러:
  1. `StudentLearningSnapshot`(최근 2개 학기) + `SubjectProgressSummary` 조회
  2. 집계 데이터를 구조화된 컨텍스트 문자열로 변환 (개인 식별 정보 포함 여부는 교사 권한 확인 후 결정)
  3. Claude API (`claude-sonnet-4-6`) 호출: system prompt에 학생 데이터 컨텍스트, user message에 교사 질의
  4. 응답 스트리밍 또는 단일 응답 반환
- 환경 변수: `ANTHROPIC_API_KEY`

#### 11-B: 챗봇 UI (클라이언트)
- 분석 대시보드(`/students/:id/analytics`) 하단에 챗봇 패널 추가
- 채팅 입력창 + 메시지 버블 목록 (교사 질의 / AI 응답)
- 전송 중 로딩 인디케이터
- 대화 히스토리는 세션 내 Zustand 상태로 관리 (서버에 저장하지 않음)

#### 11-C: E2E 시나리오 (Playwright)
- `e2e/chatbot.spec.ts`
- 교사 로그인 → 분석 대시보드 → 챗봇 질의 입력 → AI 응답 수신 확인
- 학생 계정으로 챗봇 엔드포인트 직접 호출 시 403 확인

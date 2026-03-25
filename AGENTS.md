# Instruction

## Source of truth

- Product requirements live in `docs/requirements.md`.
- `docs/about_agents.md.txt` defines how agent-facing instruction files in this repository should stay minimal and non-generic.

## Confirmed stack choices

- Backend: Express
- Frontend: React
- Styling: Tailwind CSS
- Admin/dashboard UI: `shadcn/ui`
- Server state: TanStack Query
- Client-only shared state: Zustand, only when TanStack Query is not the right fit
- Package manager: `pnpm`
- Architecture: Monorepo using `pnpm`

Do not introduce undocumented alternatives unless the repository is explicitly updated to adopt them.

## Build, test, and lint commands

There are currently no build, test, or lint scripts checked into this repository.

There is no single-test command yet because there is no executable test suite in the repo.

When code is bootstrapped later, prefer documenting the exact `pnpm` scripts that exist rather than inventing generic commands.

## High-level architecture

This project is a teacher-facing web application for managing student academic records and counseling data, with selected visibility to students and parents.

The main product domains from `requirements.md` are:

- **학생 기본 정보 / 학생부**: 이름, 학년, 반, 번호, 출결, 특기사항 같은 핵심 학생 정보
- **성적 관리**: 학기별/과목별 성적 입력, 수정, 총점/평균/등급 계산, 과목별 조회, 레이더 차트 시각화
- **피드백**: 성적, 행동, 출결, 태도 등에 대한 교사 피드백과 학생/학부모 공개 옵션
- **상담 내역**: 날짜, 주요 내용, 후속 계획을 포함한 상담 기록과 교사 간 공유
- **검색/필터링**: 학생별, 기간별, 과목별로 성적/상담/피드백 조회
- **알림**: 성적 입력, 피드백 작성, 상담 업데이트, 공개 가능한 정보 변경에 대한 알림
- **보고서**: 성적 분석, 상담 내역, 피드백 요약 보고서와 PDF/Excel 다운로드

Cross-cutting concerns that should shape the implementation:

- 교사 / 학생 / 학부모 역할 기반 접근 제어
- 학생 개인정보 및 성적 정보 보호
- 여러 교사의 동시 사용을 고려한 데이터 일관성
- 백업 및 복구 가능성
- 모바일에서도 usable한 웹 UI

Student identity data is the core record. Grades, feedback, counseling, notifications, and reports should hang off that core instead of being modeled as unrelated feature silos.

## Project-specific conventions

- Use TanStack Query as the default source of truth for remote data. Do not mirror fetched server data into Zustand just for convenience.
- Use Zustand only for genuinely client-local shared state such as UI toggles, temporary wizard state, or cross-page local filters that are not authoritative server data.
- Build admin-facing screens with `shadcn/ui` primitives first, then compose Tailwind utilities around them.
- Keep grade calculation rules centralized so totals, averages, and grades are not recomputed inconsistently across API handlers and UI components.
- Treat sharing/visibility as part of the domain model: counseling records may be shared across teachers, and feedback/grade updates may affect parent/student-facing surfaces.
- Preserve the Korean domain vocabulary from the requirements when naming screens, modules, and labels.

### Shared packages

- `shared/types`: API types shared between client and server.
- `shared/db`: Mongoose ORM type definitions.
- `shared/utils`: Domain-free utilities (e.g., date formatting) that must be handled identically on both client and server.

## Still undecided

The repository does **not** currently define:

- authentication strategy
- deployment target
- storage strategy for generated exports or attachments

Do not hard-code assumptions about those choices unless new repository files make them explicit.

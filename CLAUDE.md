# Instruction

## Source of truth

- Product requirements live in `requirements.md`.
- `about_agents.md.txt` defines how agent-facing instruction files in this repository should stay minimal and non-generic.

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

## Software design mindset

This project is graded on **design quality**, not just working code. Every non-trivial structural decision must be defensible by comparison to realistic alternatives.

### When proposing or implementing any architectural decision

Before settling on an approach, explicitly consider at least two alternatives and state why the chosen approach wins for *this* project's constraints. Document the reasoning in the relevant sprint spec, ADR comment, or PR description — not buried inside the code.

Questions to answer for every significant choice:

1. **What alternatives exist?** Name them concretely (e.g. "polling vs. Change Streams vs. a dedicated message broker like Kafka/RabbitMQ").
2. **What are the trade-offs of each?** Complexity, operational cost, latency, consistency guarantees, team familiarity.
3. **Why does the chosen option fit *this* project?** Tie the answer to actual constraints: MongoDB Atlas already in use, no separate broker budget, small team, educational/demo context, required feature (e.g. Change Streams for OLAP pipeline satisfies the event-driven bonus criterion).
4. **What would make you switch?** State the condition that would invalidate the choice (e.g. "if throughput exceeded X events/sec we would move to Kafka").

### Levels of decision that require this treatment

| Level | Examples | Where to record |
|-------|----------|-----------------|
| Architecture | Monorepo vs. polyrepo; OLAP same-DB vs. separate DB; REST vs. GraphQL | `docs/sprint-spec.md` background section or a new ADR file |
| Data model | Embedding vs. referencing in MongoDB; snapshot vs. view-based aggregation | Schema file header comment or sprint spec |
| Library/pattern | Change Streams vs. polling vs. Kafka; TanStack Query vs. SWR; CASL vs. custom RBAC | Sprint spec task description |
| API shape | REST resource design; query param vs. path param; pagination strategy | Sprint spec or inline PR comment |

### Things NOT to over-justify

Choices already locked in the "Confirmed stack choices" section above do not need re-litigating unless a file in the repo explicitly reopens them. Routine implementation details (variable names, minor component structure) need no written rationale.

### How this affects Claude's responses

- When asked "how should we approach X?", lead with the 2–3 candidate approaches and their trade-offs before recommending one.
- When writing new modules or schemas, add a brief comment if the structural choice is non-obvious (e.g. why a field is embedded rather than referenced).
- When the user asks to implement something, flag if the chosen approach differs from what is already in `sprint-spec.md` and explain why.
- Never introduce a new library or pattern silently. Name it, name the alternative, and state the reason in the response.

## Still undecided

The repository does **not** currently define:

- authentication strategy
- deployment target
- storage strategy for generated exports or attachments

Do not hard-code assumptions about those choices unless new repository files make them explicit.

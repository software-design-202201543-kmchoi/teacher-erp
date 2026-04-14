# 학생 관리 시스템 권한 관리 아키텍처

## 문서 목적

이 문서는 학생 정보 및 성적 관리 시스템 요구사항 명세서에 맞춰, 권한 관리 정책을 기능 단위가 아닌 시스템 전반 관점으로 일반화해 정의한다.

적용 범위는 다음 도메인을 모두 포함한다.

- 학생 기본 정보 및 학생부
- 성적 관리
- 피드백
- 상담 내역
- 검색 및 필터링
- 알림
- 보고서 생성 및 다운로드

## 권한 관리 원칙

- 역할 기반 접근 제어를 기본으로 한다.
- 역할만으로 부족한 경우 데이터 소유자, 공개 범위, 관계 정보로 세분화한다.
- 프론트엔드와 백엔드가 동일한 정책 소스를 사용한다.
- 화면 노출 제어와 API 강제 제어를 함께 적용한다.
- 학생 개인정보, 성적, 상담 정보는 최소 권한 원칙으로 보호한다.

## 사용자 역할

- 교사
- 학생
- 학부모

## 도메인별 권한 모델

### 학생 기본 정보 및 학생부

- 교사: 담당 학생 정보 조회 및 관리
- 학생: 본인 정보 조회
- 학부모: 자녀 정보 조회

### 성적 관리

- 교사: 담당 과목 또는 담당 학생 성적의 생성, 수정, 조회
- 학생: 본인 성적 조회
- 학부모: 자녀 성적 조회

### 피드백

- 교사: 작성, 수정, 조회
- 학생: 학생 공개 옵션이 활성화된 본인 피드백 조회
- 학부모: 학부모 공개 옵션이 활성화된 자녀 피드백 조회

### 상담 내역

- 교사: 기록, 수정, 조회, 교사 간 공유 범위 내 열람
- 학생 및 학부모: 정책에 의해 공개된 범위만 조회

### 검색 및 필터링

- 조회 가능한 데이터 범위 내부에서만 검색 결과를 반환
- 권한 없는 레코드는 검색 인덱스와 결과 모두에서 제외

### 알림

- 이벤트 생산은 작성 권한을 따름
- 수신 대상은 공개 범위 및 관계 기반으로 결정

### 보고서

- 교사: 담당 범위 보고서 생성 및 다운로드
- 학생: 본인 범위 보고서 조회
- 학부모: 자녀 범위 보고서 조회

## 정책 표현 방식

공유 규칙은 CASL 능력 정의로 유지한다.

- 액션: manage, create, read, update, delete
- 서브젝트: User, Student, Teacher, Parent, Grade, Feedback, Counseling, PermissionPolicy
- 조건 예시
  - teacherId 일치
  - studentId 일치
  - children 포함 여부
  - isPublicToStudent 또는 isPublicToParent

## 시스템 구성

### Shared 레이어

- 공통 규칙 정의 함수: [packages/shared/utils/src/ability.ts](packages/shared/utils/src/ability.ts)
- 공통 사용자 예시 데이터: [packages/shared/utils/src/demo-users.ts](packages/shared/utils/src/demo-users.ts)

### Backend 레이어

- 인증 컨텍스트 주입: [packages/app/server/src/middleware/authenticate.ts](packages/app/server/src/middleware/authenticate.ts)
- 정책 강제 미들웨어: [packages/app/server/src/middleware/authorize.ts](packages/app/server/src/middleware/authorize.ts)
- 정책 적용 라우트 예시: [packages/app/server/src/routes/permissions.ts](packages/app/server/src/routes/permissions.ts)

### Frontend 레이어

- 사용자 컨텍스트 및 ability 생성: [packages/app/client/src/contexts/AuthContext.tsx](packages/app/client/src/contexts/AuthContext.tsx)
- 화면 접근 가드: [packages/app/client/src/components/ProtectedRoute.tsx](packages/app/client/src/components/ProtectedRoute.tsx)
- 서버 연동 예시: [packages/app/client/src/lib/api.ts](packages/app/client/src/lib/api.ts)

## 검증 기준

- 프론트엔드 화면 접근 제어와 백엔드 API 강제 제어가 일관되게 동작한다.
- 교사, 학생, 학부모 각각에 대해 허용 및 거부 시나리오가 재현된다.
- 공개 옵션 변경 시 피드백 및 알림 가시성이 즉시 반영된다.
- 권한 없는 사용자 요청은 서버에서 403으로 차단된다.

## 요구사항 명세서와의 정합성

- 사용자 관리 요구사항: 역할별 접근 제어 반영
- 데이터 보안 요구사항: 개인정보 및 성적 정보 최소 권한 접근
- 동시성 요구사항: 서버 단 권한 강제로 일관성 유지
- 모바일 웹 요구사항: 화면 단 가드 정책 동일 적용

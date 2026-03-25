# 교사용 학생 관리 ERP (Teacher ERP)

본 프로젝트는 교사가 학생의 인적사항, 성적, 피드백, 상담 내역 등을 통합적으로 관리하는 동시에 제한된 정보를 학생과 학부모에게 안전하게 공유할 수 있는 **교사용 웹 기반 ERP 시스템**입니다. 학생 정보 보안 유지와 여러 교사의 동시 사용 환경을 고려하여 설계되었습니다.

---

## 🏗 시스템 아키텍처

프론트엔드와 백엔드 간의 느슨한 결합성을 유지하면서도 API 타입과 도메인 모델, 유틸리티 함수 등의 **공통 관심사를 중앙화**하기 위해 **`pnpm` 기반의 모노레포 아키텍처**를 채택하였습니다.

### 모노레포 아키텍처 적용

응용 프로그램 실행 환경인 `app/` 계층과 의존성이 없는 순수 공용 패키지인 `shared/` 계층으로 분리하여 구조적 안정성을 확보했습니다.

- **Client (`packages/app/client`)**: React 기반 사용자 인터페이스 및 프론트엔드 로직
- **Server (`packages/app/server`)**: Node.js & Express 기반 RESTful API 및 비즈니스 로직
- **Shared Packages**:
  - `shared/types`: 클라이언트와 서버 통신 시 공유되는 API 타입 인터페이스 정의
  - `shared/db`: 백엔드가 데이터베이스와 통신할 때 사용하는 Mongoose ORM 스키마 및 모델
  - `shared/utils`: 양측에서 공통 사용하는 도메인에 의존성 없는 유틸 모듈

## 💻 핵심 기술 스택

### Frontend

- **View**: React
- **Server State**: TanStack Query
- **Client State**: Zustand
- **Styling**: Tailwind CSS & `shadcn/ui`

### Backend

- **Server Framework**: Node.js & Express
- **Database / ORM**: MongoDB & Mongoose

### Infrastructure & Tooling

- **Package Manager**: `pnpm` workspace
- **Language**: TypeScript

---

## 📁 주요 폴더 구조

```text
teacher-erp/
├── packages/
│   ├── app/
│   │   ├── client/       # React SPA 시스템 구축
│   │   └── server/       # Express API 서버 비동기 라우트
│   ├── shared/
│   │   ├── types/        # [공통] API TypeScript 인터페이스
│   │   ├── db/           # [백엔드] Mongoose 도메인 스키마 패키지
│   │   └── utils/        # [공통] 로직 유틸리티 함수 모음
├── docs/                 # 기획 및 아키텍처 문서
├── pnpm-workspace.yaml   # 모노레포 워크스페이스 참조 설정
└── package.json          # 패키지 공통 스크립트 기반
```

---

## 📝 소프트웨어 도메인

본 시스템은 학생 ID를 **핵심 레코드**로 삼아 모든 하위 데이터를 의존적으로 관리합니다. 특정 기능들이 파편화되지 않고 학생 객체와 긴밀히 연관되도록 도메인 구조를 구성합니다:

1. **학생 기본 정보**: 이름, 학년/반/번호, 출결, 특기사항 등의 통합 핵심 프로필 관리
2. **성적 관리**: 학기/과목별 성적 입력 및 평균/등급 계산 (계산 로직 중앙 집중화), 레이더 차트 등 데이터 시각화
3. **피드백 체계**: 태도 및 활동에 대한 교사 피드백 생성 및 학생/학부모 공개 옵션 제어
4. **상담 내역**: 정보 공유 및 권한에 기반한 지속적인 후속 계획 및 기록 관리
5. **접근 제어**: 교사/학생/학부모 역할 기반 접근 제어에 따른 API 설계

---

## 🚀 시작하기

`pnpm`이 프로젝트 전역 패키지 관리 도구로 사용됩니다.

1. **저장소 클론 및 패키지 설치**
   최상위 디렉토리에서 전체 의존성들을 링킹합니다.

   ```bash
   pnpm install
   ```

2. **통합 개발환경 실행 (TBD)**
   아래 명령어로 한 번에 Client와 Server를 구동합니다.

   ```bash
   pnpm run dev
   ```

3. **데이터베이스 테스트**
   로컬에 설치된 MongoDB 메모리 서버를 통해 `shared/db` 패키지의 Mongoose 연동 단위 테스트가 가능합니다.
   ```bash
   pnpm --filter server run db-test
   ```

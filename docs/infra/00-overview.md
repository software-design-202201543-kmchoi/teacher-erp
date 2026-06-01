# Teacher ERP — AWS 인프라 개요

> 작성일: 2026-05-17
> 대상 환경: ECS Fargate (Production), Docker Compose (Development)
> 스택: Express 5 · MongoDB Atlas (AWS) · React + Vite · pnpm Monorepo

---

## GCP → AWS 서비스 매핑

| 역할 | GCP (이전) | AWS (현재) | 비용 절감 포인트 |
|------|-----------|-----------|----------------|
| Kubernetes 클러스터 | GKE Autopilot | **ECS Fargate** | EKS 컨트롤 플레인 비용 없음 (~$73/월) |
| 컨테이너 이미지 저장소 | Artifact Registry | **Amazon ECR** | 비슷한 수준, AWS 네이티브 통합 |
| GitOps / CI-CD | Cloud Build + Config Sync | **GitHub Actions** (OIDC) | 무료 2,000분/월, 장기 자격증명 불필요 |
| TLS 인증서 | Google-managed Certificate | **ACM** | 무료 |
| 인그레스 | GKE Ingress + Cloud LB | **CloudFront + ALB** | 정적 파일을 엣지에서 서빙 |
| 정적 파일 호스팅 | GKE Nginx Pod (2개) | **S3 + CloudFront** | Pod 비용 → 사실상 0원 |
| 시크릿 관리 | Secret Manager | **SSM Parameter Store** | Standard Tier 무료 (SM은 $0.40/건/월) |
| 로그·메트릭·알람 | Cloud Logging + Monitoring | **CloudWatch** | 내장, 별도 설치 없음 |
| 선언형 인프라 | Terraform (google provider) | **Terraform (aws provider)** | — |
| 상태 저장소 | GCS | **S3 + DynamoDB** | — |
| MongoDB | Atlas on GCP | **Atlas on AWS** | PrivateLink로 VPC 내부 접근 |

---

## 목표 아키텍처

```
사용자 브라우저
      │ HTTPS
      ▼
 ┌──────────────────────────────────────────────┐
 │         CloudFront (teacher-erp.kimwash.xyz)  │
 │  /api/* → ALB (no cache, forward headers)    │
 │  /*     → S3  (SPA, long-term cache)         │
 └──────────────────────────────────────────────┘
          │                     │
          ▼                     ▼
   ┌─────────────┐      ┌──────────────┐
   │ ALB (HTTP)  │      │  S3 Bucket   │
   │ ap-ne-2     │      │ (정적 파일)  │
   └──────┬──────┘      └──────────────┘
          │ awsvpc
          ▼
   ┌─────────────────────────────────────┐
   │  ECS Fargate (private subnet)       │
   │  server (256 CPU / 512 MB)          │
   │  Spot 75% + Fargate 25% 혼합        │
   └──────────────┬──────────────────────┘
                  │ SSM Parameter Store
                  │ (MONGODB_URI, JWT_SECRET)
                  │
                  ▼
         MongoDB Atlas (AWS ap-northeast-2)
         [PrivateLink 활성화 시 VPC 내부 접근]

GitHub push → GitHub Actions → ECR → ECS deploy
                             → S3 sync → CloudFront invalidate
```

---

## 문서 목록

| 문서 | 주제 |
|------|------|
| [01-mongodb-atlas.md](./01-mongodb-atlas.md) | MongoDB Atlas on AWS & 트랜잭션 |
| [02-ecs-zero-downtime.md](./02-ecs-zero-downtime.md) | ECS Fargate 무중단 배포 |
| [03-github-actions-pipeline.md](./03-github-actions-pipeline.md) | GitHub Actions CI/CD 파이프라인 |
| [04-multi-tenancy.md](./04-multi-tenancy.md) | 멀티테넌시 전략 |
| [05-health-observability.md](./05-health-observability.md) | 헬스체크 & CloudWatch 가시성 |

---

## 현재 상태 vs 목표 상태

### 현재 (docker-compose 기반 로컬 개발)

```
[Client :5173] ──→ [Server :3001] ──→ [MongoDB Standalone]
```

### 목표 (AWS 기반 프로덕션)

```
GitHub push → GitHub Actions → ECR/S3 → ECS Fargate / CloudFront → MongoDB Atlas
```

---

## 월간 예상 비용 (소규모 학교 ERP 기준)

| 항목 | 사양 | 예상 비용 |
|------|------|----------|
| ECS Fargate | 0.25vCPU / 512MB × 2 태스크 (Spot 75%) | ~$5–10 |
| ALB | 1개 | ~$16 |
| NAT Gateway | 단일 | ~$30 |
| CloudFront + S3 | 소규모 트래픽 | ~$1–3 |
| ECR | 이미지 저장소 | ~$1 |
| CloudWatch | 로그 30일 보존 | ~$3 |
| **합계** | | **~$56–63/월** |

> GCP GKE Autopilot 대비 약 **40–50% 비용 절감** (GKE는 컨트롤 플레인 + 노드 비용으로 $130–180/월 예상)

---

## 비용 절감 핵심 결정사항

1. **ECS Fargate (EKS 불사용)** — EKS 컨트롤 플레인 $73/월 절감
2. **Fargate Spot 75% 혼합** — 컴퓨팅 비용 60–70% 절감 (Spot 실패 시 자동 Fargate 대체)
3. **S3 + CloudFront (Nginx Pod 불사용)** — 클라이언트 Pod 2개 비용 → 거의 0원
4. **단일 NAT Gateway** — AZ당 1개 대비 ~$30/월 절감 (HA 필요 시 2개로 변경)
5. **SSM Parameter Store** — Secrets Manager 대비 비용 없음 (Standard Tier 무료)
6. **GitHub Actions OIDC** — Cloud Build 사용량 비용 없음, 장기 자격증명 불필요
7. **CloudWatch 30일 보존** — 무제한 보존 대비 스토리지 비용 절감
8. **CloudFront PriceClass_200** — 전 세계 엣지 대신 아시아·북미·유럽만 사용

---

## AWS CLI 사전 설정

```bash
export AWS_REGION="ap-northeast-2"
export AWS_PROFILE="teacher-erp"  # ~/.aws/credentials 프로파일

# Terraform 상태 저장소 사전 생성
aws s3api create-bucket --bucket teacher-erp-ckm-tfstate \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

aws s3api put-bucket-versioning --bucket teacher-erp-ckm-tfstate \
  --versioning-configuration Status=Enabled

aws dynamodb create-table --table-name teacher-erp-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region ap-northeast-2

# Terraform 초기화 및 배포
cd terraform
terraform init
terraform plan
terraform apply
```

---

## 단계별 도입 계획

```
Phase 1 (즉시)
  ├── terraform apply로 VPC, ECR, ECS, ALB, S3, CloudFront 생성
  └── SSM 파라미터에 실제 값 설정

Phase 2 (단기)
  ├── GitHub Actions Secrets 등록 (AWS_DEPLOY_ROLE_ARN, S3_CLIENT_BUCKET, CLOUDFRONT_DISTRIBUTION_ID)
  └── main 브랜치 push → 자동 배포 검증

Phase 3 (중기)
  ├── MongoDB Atlas AWS 리전으로 이전 (AP_NORTHEAST_2)
  └── terraform/_atlas_disabled/ 활성화 (PrivateLink 연결)

Phase 4 (장기, 선택)
  └── 학교별 ECS 서비스 분리 (멀티테넌시 강화)
```

---

## 공통 규칙

- **모든 시크릿**은 SSM Parameter Store(SecureString)에 저장한다. 소스코드나 환경변수 파일에 직접 쓰지 않는다.
- **이미지 태그**는 항상 `git SHA 앞 8자리`를 사용한다. `latest` 태그를 운영 배포에 단독으로 사용하지 않는다.
- **인프라 선언**은 `terraform/`으로, **ECS 태스크 정의 템플릿**은 `infra/ecs/`에 보관한다.
- **CloudFront**가 단일 진입점이다. ALB 주소를 직접 노출하지 않는다.

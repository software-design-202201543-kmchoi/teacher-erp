# MongoDB Atlas on GCP & 트랜잭션

> 관련 파일:  
> `packages/shared/db/src/schemas/` · `packages/app/server/src/db.ts`  
> `packages/app/server/src/routes/grades.ts` · `packages/app/server/src/routes/feedback.ts`  
> `terraform/mongodb-atlas.tf`

---

## 1. 왜 MongoDB Atlas인가

GCP 자체에는 MongoDB 호환 완전관리형 서비스가 없다.  
MongoDB Atlas는 GCP 인프라 위에서 동작하는 공식 완전관리형 MongoDB 서비스로,  
GCP와의 **Private Service Connect** 연동을 통해 퍼블릭 인터넷을 거치지 않고 GKE에서 접근할 수 있다.

| 항목 | 자체 StatefulSet | MongoDB Atlas |
|------|-----------------|---------------|
| ReplicaSet 구성 | 직접 관리 | 자동 (M10 이상) |
| 트랜잭션 지원 | 직접 설정 필요 | M10 이상 기본 지원 |
| 자동 백업 | 별도 구성 | 자동 연속 백업 |
| Point-in-time 복구 | 직접 구성 | 기본 제공 |
| 장애 자동 복구 | election ~10초 | 동일 |
| 운영 부담 | 높음 | 낮음 |

이 프로젝트에서 원자성이 반드시 필요한 쓰기 시나리오:

| 작업 | 관련 컬렉션 | 리스크 |
|------|-------------|--------|
| 성적 등록 → 학생·학부모 알림 생성 | `Grade` + `Notification` | 성적 저장 성공, 알림 누락 |
| 피드백 저장 → visibility에 따른 알림 | `Feedback` + `Notification` | 피드백 저장 성공, 알림 누락 |
| 상담 기록 저장 → 교사 간 공유 알림 | `CounselingRecord` + `Notification` | 저장 성공, 공유 알림 누락 |

---

## 2. 개발 환경 — docker-compose ReplicaSet

로컬 개발에서도 트랜잭션을 테스트하기 위해 docker-compose에서 단일 노드 ReplicaSet을 구성한다.

```yaml
# docker-compose.yml (ReplicaSet 버전)
services:
  mongo:
    image: mongo:7
    command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: |
        mongosh --eval "
          try { rs.status().ok }
          catch(e) {
            rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]});
          }
        "
      interval: 10s
      timeout: 10s
      retries: 10
      start_period: 20s

  server:
    environment:
      MONGODB_URI: mongodb://mongo:27017/teacher_erp?replicaSet=rs0
    depends_on:
      mongo:
        condition: service_healthy
```

> `start_period: 20s`: ReplicaSet primary 선출(election)이 완료되기까지의 시간을 확보한다.

---

## 3. 운영 환경 — MongoDB Atlas on GCP

### 3.1 Terraform으로 Atlas 클러스터 선언

MongoDB Atlas 공식 Terraform provider를 사용해 클러스터를 선언형으로 관리한다.

```hcl
# terraform/mongodb-atlas.tf

terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.15"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "mongodbatlas" {
  # MONGODB_ATLAS_PUBLIC_KEY / MONGODB_ATLAS_PRIVATE_KEY 환경변수로 인증
}

# Atlas 프로젝트
resource "mongodbatlas_project" "teacher_erp" {
  name   = "teacher-erp"
  org_id = var.atlas_org_id
}

# M10 클러스터 — 트랜잭션 지원 최소 티어
resource "mongodbatlas_advanced_cluster" "main" {
  project_id   = mongodbatlas_project.teacher_erp.id
  name         = "teacher-erp-prod"
  cluster_type = "REPLICASET"

  replication_specs {
    region_configs {
      # GCP 서울 리전 (asia-northeast3)
      provider_name = "GCP"
      region_name   = "ASIA_NORTHEAST_3"
      priority      = 7

      electable_specs {
        instance_size = "M10"
        node_count    = 3
      }

      analytics_specs {
        instance_size = "M10"
        node_count    = 1   # 분석 쿼리 전용 노드 (운영 성능 영향 없음)
      }
    }
  }

  backup_enabled = true
  pit_enabled    = true    # Point-in-time 복구 활성화

  advanced_configuration {
    javascript_enabled           = false
    minimum_enabled_tls_protocol = "TLS1_2"
  }
}

# 자동 백업 정책
resource "mongodbatlas_cloud_backup_schedule" "main" {
  project_id   = mongodbatlas_project.teacher_erp.id
  cluster_name = mongodbatlas_advanced_cluster.main.name

  reference_hour_of_day    = 3   # 새벽 3시 (KST 기준)
  reference_minute_of_hour = 0

  policy_item_hourly {
    frequency_interval = 6
    retention_unit     = "days"
    retention_value    = 7
  }

  policy_item_daily {
    frequency_interval = 1
    retention_unit     = "days"
    retention_value    = 14
  }

  policy_item_weekly {
    frequency_interval = 6   # 토요일
    retention_unit     = "weeks"
    retention_value    = 4
  }
}
```

```hcl
# terraform/variables.tf
variable "atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
  sensitive   = true
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast3"
}
```

```bash
# 초기 적용
cd terraform
terraform init
terraform plan -var="atlas_org_id=$ATLAS_ORG_ID" -var="project_id=$PROJECT_ID"
terraform apply
```

### 3.2 Private Service Connect — VPC 내부 연결

Atlas 클러스터에 퍼블릭 인터넷을 거치지 않고 GKE VPC에서 직접 접근한다.

```hcl
# terraform/atlas-private-endpoint.tf

# GCP 측 Private Service Connect 엔드포인트
resource "google_compute_address" "atlas_psc" {
  name         = "atlas-psc-address"
  region       = var.region
  subnetwork   = google_compute_subnetwork.gke.id
  address_type = "INTERNAL"
}

resource "google_compute_forwarding_rule" "atlas_psc" {
  name                  = "atlas-psc-forwarding"
  region                = var.region
  target                = mongodbatlas_privatelink_endpoint.main.service_attachment_names[0]
  load_balancing_scheme = ""
  ip_address            = google_compute_address.atlas_psc.id
  network               = google_compute_network.main.id
}

# Atlas 측 Private Endpoint 수락
resource "mongodbatlas_privatelink_endpoint" "main" {
  project_id    = mongodbatlas_project.teacher_erp.id
  provider_name = "GCP"
  region        = "ASIA_NORTHEAST_3"
}

resource "mongodbatlas_privatelink_endpoint_service" "main" {
  project_id                  = mongodbatlas_privatelink_endpoint.main.project_id
  private_link_id             = mongodbatlas_privatelink_endpoint.main.private_link_id
  provider_name               = "GCP"
  endpoint_service_id         = google_compute_forwarding_rule.atlas_psc.id
  gcp_project_id              = var.project_id

  endpoints {
    ip_address    = google_compute_address.atlas_psc.address
    endpoint_name = google_compute_forwarding_rule.atlas_psc.name
  }
}
```

### 3.3 연결 문자열 — Secret Manager에 저장

```bash
# Atlas 콘솔 또는 Terraform output에서 연결 문자열 확인 후 등록
ATLAS_URI="mongodb+srv://teacher-erp-prod.xxxxx.mongodb.net/teacher_erp\
?authSource=admin&replicaSet=atlas-xxxxx-shard-0\
&readPreference=primaryPreferred&w=majority&retryWrites=true"

gcloud secrets create mongodb-uri \
  --replication-policy="user-managed" \
  --locations="asia-northeast3"

echo -n "$ATLAS_URI" | \
  gcloud secrets versions add mongodb-uri --data-file=-

# JWT 시크릿 등록
gcloud secrets create jwt-secret \
  --replication-policy="user-managed" \
  --locations="asia-northeast3"

openssl rand -base64 48 | \
  gcloud secrets versions add jwt-secret --data-file=-
```

---

## 4. 서버 코드 — 트랜잭션 패턴

트랜잭션 코드는 Atlas와 동일하다. Atlas M10 이상은 ReplicaSet으로 프로비저닝되므로 별도 설정 없이 `session.withTransaction()`을 바로 사용할 수 있다.

### 4.1 connectDB 강화

```typescript
// packages/app/server/src/db.ts
import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not set – skipping MongoDB connection');
    return;
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected – Mongoose will auto-reconnect');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    // Atlas SRV 연결 시 추가 옵션 불필요 — 드라이버가 자동 처리
  });

  console.log('Connected to MongoDB Atlas');
}
```

### 4.2 withTransaction 유틸리티

```typescript
// packages/app/server/src/utils/withTransaction.ts
import mongoose from 'mongoose';

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(fn, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxCommitTimeMS: 5000,
    });
  } finally {
    await session.endSession();
  }
}
```

### 4.3 grades.ts 라우터 적용 예시

현재 코드는 `demoGrades` 인메모리 배열을 사용한다. MongoDB 연동 후 아래 패턴으로 전환한다.

```typescript
// packages/app/server/src/routes/grades.ts (MongoDB 연동 버전 발췌)
import { GradeModel, NotificationModel } from '@teacher-erp/shared-db';
import { withTransaction } from '../utils/withTransaction.js';

router.post('/by-student/:studentId', authenticate, async (req, res) => {
  if (req.authUser!.role !== 'TEACHER') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { studentId } = req.params;
  const { subject_id, term, score } = req.body;

  try {
    const newGrade = await withTransaction(async (session) => {
      const [grade] = await GradeModel.create(
        [{ student_id: studentId, subject_id, teacher_id: req.authUser!._id, term, score }],
        { session }
      );

      // 알림 생성 — 같은 트랜잭션 안에서 원자적으로 처리
      await NotificationModel.insertMany(
        [{ recipient_id: studentId, title: '새 성적 등록', body: `${term} ${score}점` }],
        { session }
      );

      return grade;
    });

    res.status(201).json(newGrade);
  } catch (err) {
    console.error('Grade creation failed:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### 4.4 feedback.ts 라우터 적용 포인트

```typescript
// visibility 기반 알림 대상 결정 후 트랜잭션 안에서 일괄 처리
const notificationTargets = buildNotificationTargets(visibility, studentId, parents);

await withTransaction(async (session) => {
  await FeedbackModel.create([feedbackData], { session });
  await NotificationModel.insertMany(notificationTargets, { session });
});
```

---

## 5. Atlas 장애 시나리오와 자동 복구

| 시나리오 | Atlas 동작 |
|----------|------------|
| Primary 노드 다운 | Atlas가 자동으로 Secondary를 Primary로 선출 (~30초) |
| 리전 전체 장애 | Multi-region 클러스터 구성 시 다른 리전으로 자동 전환 |
| 데이터 손상 | Point-in-time 복구로 임의 시점으로 복원 |
| 연결 문자열 노출 | Secret Manager 버전 교체 후 GKE Secret 업데이트 |

---

## 6. 인덱스 전략

Atlas에서도 Mongoose 스키마 인덱스는 동일하게 동작한다.  
운영 중 인덱스 추가는 Atlas의 `Rolling Index Build`를 사용해 무중단으로 처리한다.

```typescript
// packages/shared/db/src/schemas/grade.ts — 기존 유지
gradeSchema.index(
  { student_id: 1, subject_id: 1, teacher_id: 1, term: 1 },
  { unique: true }
);

// 추가 권장 인덱스
gradeSchema.index({ student_id: 1, term: 1 });

feedbackSchema.index({ student_id: 1, visibility: 1 });
feedbackSchema.index({ teacher_id: 1, createdAt: -1 });

counselingRecordSchema.index({ student_id: 1, counsel_date: -1 });
counselingRecordSchema.index({ teacher_id: 1, is_shared: 1 });
```

> Atlas 콘솔 → Performance Advisor에서 느린 쿼리와 누락된 인덱스를 자동으로 제안받을 수 있다.

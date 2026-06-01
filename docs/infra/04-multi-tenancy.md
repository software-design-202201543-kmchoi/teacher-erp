# 멀티테넌시 아키텍처

> 관련 파일:  
> `packages/app/server/src/middleware/authenticate.ts`  
> `packages/shared/db/src/schemas/user.ts`  
> `terraform/` · `infra/`

---

## 1. 테넌트 단위 정의

이 프로젝트에서 테넌트는 **학교(School)** 단위다.  
각 학교는 독립된 데이터, 사용자 계정, 접근 권한을 가진다.

---

## 2. 세 가지 격리 전략

### 전략 A — GCP Project-per-Tenant (최강 격리)

각 학교가 별도의 GCP 프로젝트를 갖는다. GKE 클러스터와 MongoDB Atlas 클러스터, Artifact Registry도 모두 분리된다.

```
GCP Project: school-001-erp
  ├── GKE Autopilot cluster
  ├── MongoDB Atlas (전용 클러스터)
  └── Secret Manager (전용)

GCP Project: school-002-erp
  ├── GKE Autopilot cluster
  ├── MongoDB Atlas (전용 클러스터)
  └── Secret Manager (전용)
```

**장점**: 청구·감사·IAM이 학교 단위로 완전 분리  
**단점**: 학교 수에 비례해 인프라 비용이 선형 증가 (GKE 클러스터 기본 비용 ~$73/월)

### 전략 B — Namespace-per-Tenant (중간 격리, 권장)

단일 GCP 프로젝트 + 단일 GKE 클러스터 안에서 학교별로 K8s Namespace를 분리한다.  
MongoDB Atlas는 학교별 전용 데이터베이스 또는 전용 클러스터를 사용한다.

```
GCP Project: teacher-erp-prod (공유)
  GKE Cluster
    ├── Namespace: school-001-erp
    │     ├── Deployment: server
    │     └── Deployment: client
    ├── Namespace: school-002-erp
    │     ├── Deployment: server
    │     └── Deployment: client
    └── Namespace: shared-infra
          └── External Secrets Operator

MongoDB Atlas (공유 GCP 리전)
  ├── Cluster: school-001 (전용)
  └── Cluster: school-002 (전용)
```

**장점**: 인프라 공유로 비용 절감, 데이터는 Atlas 레벨에서 완전 분리  
**단점**: 한 학교의 Pod 자원 과다 사용이 타 학교에 영향 가능 (ResourceQuota로 완화)

### 전략 C — 애플리케이션 수준 (최소 격리)

단일 인프라에서 모든 컬렉션에 `school_id` 필드를 추가해 행 수준으로 격리한다.

**장점**: 가장 저렴, 운영 단순  
**단점**: 코드 버그(필터 누락)가 타 학교 데이터 노출로 직결

---

## 3. 권장 선택: 전략 B (Namespace-per-Tenant)

교육 데이터는 미성년자 개인정보를 포함하므로 데이터는 학교별 Atlas 클러스터로 분리하고,  
애플리케이션은 GKE Namespace로 논리적으로 분리하는 전략 B를 권장한다.

---

## 4. Terraform — 학교별 Namespace & 리소스 프로비저닝

```hcl
# terraform/tenants.tf

locals {
  schools = {
    "school-001" = { domain = "school001.erp.example.com", atlas_tier = "M10" }
    "school-002" = { domain = "school002.erp.example.com", atlas_tier = "M10" }
  }
}

# 학교별 K8s Namespace
resource "kubernetes_namespace" "school" {
  for_each = local.schools

  metadata {
    name = "${each.key}-erp"
    labels = {
      "app.kubernetes.io/part-of" = "teacher-erp"
      "tenant"                    = each.key
    }
  }
}

# 학교별 ResourceQuota — 한 학교가 클러스터 자원을 독점하지 못하게
resource "kubernetes_resource_quota" "school" {
  for_each = local.schools

  metadata {
    name      = "tenant-quota"
    namespace = kubernetes_namespace.school[each.key].metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "2"
      "requests.memory" = "4Gi"
      "limits.cpu"      = "4"
      "limits.memory"   = "8Gi"
      "pods"            = "20"
    }
  }
}

# 학교별 MongoDB Atlas 클러스터
resource "mongodbatlas_advanced_cluster" "school" {
  for_each = local.schools

  project_id   = mongodbatlas_project.teacher_erp.id
  name         = "${each.key}-prod"
  cluster_type = "REPLICASET"

  replication_specs {
    region_configs {
      provider_name = "GCP"
      region_name   = "ASIA_NORTHEAST_3"
      priority      = 7
      electable_specs {
        instance_size = each.value.atlas_tier
        node_count    = 3
      }
    }
  }

  backup_enabled = true
  pit_enabled    = true
}

# 학교별 Atlas 연결 문자열 → Secret Manager
resource "google_secret_manager_secret" "mongodb_uri" {
  for_each = local.schools

  secret_id = "mongodb-uri-${each.key}"
  project   = var.project_id
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "mongodb_uri" {
  for_each = local.schools

  secret      = google_secret_manager_secret.mongodb_uri[each.key].id
  secret_data = mongodbatlas_advanced_cluster.school[each.key].connection_strings[0].standard_srv
}
```

---

## 5. Config Sync — 학교별 GitOps 동기화

Config Sync의 `RepoSync`를 사용해 학교별 Namespace를 독립적인 Git 경로로 동기화한다.

```yaml
# infra/shared/config-sync-schools.yaml
# 각 학교 Namespace에 RepoSync 등록
apiVersion: configsync.gke.io/v1beta1
kind: RepoSync
metadata:
  name: repo-sync
  namespace: school-001-erp
spec:
  sourceFormat: unstructured
  git:
    repo: https://github.com/software-design-202201543-kmchoi/teacher-erp
    branch: main
    dir: infra/tenants/school-001
    auth: token
    secretRef:
      name: config-sync-git-creds
---
apiVersion: configsync.gke.io/v1beta1
kind: RepoSync
metadata:
  name: repo-sync
  namespace: school-002-erp
spec:
  sourceFormat: unstructured
  git:
    repo: https://github.com/software-design-202201543-kmchoi/teacher-erp
    branch: main
    dir: infra/tenants/school-002
    auth: token
    secretRef:
      name: config-sync-git-creds
```

```
infra/
└── tenants/
    ├── school-001/
    │   ├── kustomization.yaml     ← school-001 전용 패치
    │   └── external-secret.yaml  ← school-001 mongodb-uri 참조
    └── school-002/
        ├── kustomization.yaml
        └── external-secret.yaml
```

---

## 6. 신규 학교 온보딩 절차

```bash
# 1. terraform/tenants.tf의 locals.schools에 항목 추가
#    "school-003" = { domain = "school003.erp.example.com", atlas_tier = "M10" }

# 2. Terraform 적용 — Namespace, Atlas 클러스터, Secret 자동 생성
terraform plan && terraform apply

# 3. infra/tenants/school-003/ 디렉토리 생성 후 git push
mkdir -p infra/tenants/school-003
cp -r infra/tenants/school-001/* infra/tenants/school-003/
# school-003에 맞게 external-secret.yaml의 secret key 수정
git add infra/tenants/school-003
git commit -m "feat: onboard school-003"
git push

# Config Sync가 변경을 감지하고 school-003-erp Namespace에 자동 배포
```

---

## 7. 전략 C — 애플리케이션 수준 구현 (소규모 시작 시)

### 스키마에 school_id 추가

```typescript
// packages/shared/db/src/schemas/user.ts (수정 예시)
const baseUserSchema = new Schema({
  school_id: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
}, {
  discriminatorKey: 'role',
  timestamps: true,
});

// email 유니크 범위를 학교로 한정
baseUserSchema.index({ school_id: 1, email: 1 }, { unique: true });
```

### JWT에 school_id 포함

```typescript
// packages/app/server/src/utils/authToken.ts
export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  school_id: string;   // 추가
  iat: number;
  exp: number;
}
```

### 테넌트 미들웨어

```typescript
// packages/app/server/src/middleware/tenant.ts
import type { Request, Response, NextFunction } from 'express';

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const schoolId = req.authUser?.school_id;
  if (!schoolId) {
    res.status(403).json({ message: 'No tenant context' });
    return;
  }
  req.tenantFilter = { school_id: schoolId };
  next();
}
```

```typescript
// packages/app/server/src/routes/grades.ts
router.get('/by-student/:studentId', authenticate, async (req, res) => {
  const grades = await GradeModel.find({
    ...req.tenantFilter,           // school_id 자동 포함
    student_id: req.params.studentId,
  });
  res.json(grades);
});
```

---

## 8. 전략 비교

| 기준 | GCP Project (A) | Namespace (B) | 앱 수준 (C) |
|------|-----------------|---------------|------------|
| 데이터 격리 | 완전 (인프라) | Atlas 레벨 | 소프트웨어 의존 |
| 청구 분리 | GCP 프로젝트 단위 | 어려움 | 어려움 |
| 신규 학교 온보딩 | Terraform 항목 추가 | Terraform 항목 추가 | DB 레코드 추가 |
| 월 비용 (학교당) | GKE ~$73 + Atlas | Atlas만 | Atlas만 |
| 개인정보 법령 준수 | 가장 유리 | 유리 | 추가 설계 필요 |
| 권장 학교 규모 | 소수 (≤10) | 중간 (≤100) | 대규모 (100+) |

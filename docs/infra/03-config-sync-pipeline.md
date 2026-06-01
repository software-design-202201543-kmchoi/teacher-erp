# Config Sync GitOps 배포 파이프라인

> 관련 파일:  
> `infra/` · `.github/workflows/` · `terraform/`

---

## 1. GCP GitOps 스택

```
GitHub push
    │
    ▼
Cloud Build (빌드·테스트·이미지 push)
    │
    ▼
Artifact Registry (이미지 저장)
    │
    ▼ (kustomize 이미지 태그 업데이트 → git push)
GitHub (infra/overlays/production/kustomization.yaml)
    │
    ▼
Config Sync (GKE 네이티브 GitOps — 변경 감지 후 apply)
    │
    ▼
GKE Autopilot (RollingUpdate)
```

- **Config Sync**는 ArgoCD와 동일한 GitOps 원칙을 GKE에 네이티브로 구현한다.
- 수동 `kubectl apply`는 Config Sync가 다음 sync 사이클에 원복한다.
- 롤백 = `git revert` 후 push.

---

## 2. Config Sync 설치

### Terraform으로 선언적 설치

```hcl
# terraform/config-sync.tf

# GKE Fleet에 Config Sync 기능 활성화
resource "google_gke_hub_feature" "config_sync" {
  name     = "configmanagement"
  location = "global"
  project  = var.project_id

  spec {}
}

resource "google_gke_hub_membership_binding" "config_sync" {
  membership_binding_id = "teacher-erp"
  membership_id         = google_container_cluster.main.name
  scope                 = google_gke_hub_scope.main.name
  location              = var.region
  project               = var.project_id
}
```

### gcloud CLI로 빠르게 설치

```bash
# Config Sync 활성화 (GKE Fleet)
gcloud container fleet config-management enable \
  --project=$PROJECT_ID

# GitHub 저장소 연결
gcloud container fleet config-management apply \
  --membership=$CLUSTER_NAME \
  --config=- \
  --project=$PROJECT_ID <<EOF
applySpecVersion: 1
spec:
  configSync:
    enabled: true
    sourceFormat: unstructured
    syncRepo: https://github.com/software-design-202201543-kmchoi/teacher-erp
    syncBranch: main
    syncDir: infra/overlays/production
    secretType: token   # GitHub Personal Access Token
    policyDir: infra/overlays/production
  policyController:
    enabled: true
EOF
```

```bash
# GitHub PAT를 Secret으로 등록
kubectl create secret generic config-sync-git-creds \
  --namespace=config-management-system \
  --from-literal=username=your-github-username \
  --from-literal=token=$GITHUB_PAT
```

---

## 3. Config Sync 동기화 상태 확인

```bash
# nomos CLI 설치
gcloud components install nomos

# 동기화 상태 확인
nomos status --contexts=$(kubectl config current-context)

# K8s 리소스로 직접 확인
kubectl get rootsync root-sync -n config-management-system -o yaml
kubectl get reposync -n teacher-erp
```

---

## 4. Cloud Build — CI/CD 파이프라인

### Terraform으로 트리거 선언

```hcl
# terraform/cloud-build.tf

resource "google_cloudbuild_trigger" "deploy" {
  name        = "teacher-erp-deploy"
  description = "main 브랜치 push 시 빌드 및 배포"
  project     = var.project_id

  github {
    owner = "your-org"
    name  = "teacher-erp"
    push {
      branch = "^main$"
    }
  }

  filename = "cloudbuild.yaml"

  service_account = google_service_account.cloud_build.id
}

resource "google_service_account" "cloud_build" {
  account_id   = "cloud-build-sa"
  display_name = "Cloud Build Service Account"
}

resource "google_project_iam_member" "cloud_build_roles" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/container.developer",
    "roles/secretmanager.secretAccessor",
    "roles/source.reader",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}
```

### Cloud Build 파이프라인 정의

```yaml
# cloudbuild.yaml
steps:
  # ── 1. 의존성 설치 & 타입 체크 ───────────────────────────────────────────
  - name: "node:20-alpine"
    id: typecheck
    entrypoint: sh
    args:
    - -c
    - |
      corepack enable
      pnpm install --frozen-lockfile
      pnpm --filter server typecheck
      pnpm --filter client typecheck

  # ── 2. 서버 이미지 빌드 & push ───────────────────────────────────────────
  - name: "gcr.io/cloud-builders/docker"
    id: build-server
    waitFor: [typecheck]
    args:
    - build
    - --cache-from
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:latest"
    - -f
    - packages/app/server/Dockerfile
    - -t
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:$COMMIT_SHA"
    - -t
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:latest"
    - .

  - name: "gcr.io/cloud-builders/docker"
    id: push-server
    waitFor: [build-server]
    args:
    - push
    - --all-tags
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server"

  # ── 3. 클라이언트 이미지 빌드 & push ─────────────────────────────────────
  - name: "gcr.io/cloud-builders/docker"
    id: build-client
    waitFor: [typecheck]
    args:
    - build
    - --cache-from
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client:latest"
    - -f
    - packages/app/client/Dockerfile
    - -t
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client:$COMMIT_SHA"
    - -t
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client:latest"
    - .

  - name: "gcr.io/cloud-builders/docker"
    id: push-client
    waitFor: [build-client]
    args:
    - push
    - --all-tags
    - "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client"

  # ── 4. kustomize 이미지 태그 업데이트 → git push ─────────────────────────
  - name: "gcr.io/google.com/cloudsdktool/cloud-sdk"
    id: update-manifests
    waitFor: [push-server, push-client]
    entrypoint: bash
    args:
    - -c
    - |
      # kustomize 설치
      curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
      mv kustomize /usr/local/bin/

      cd infra/overlays/production

      # 이미지 태그를 git SHA로 고정
      kustomize edit set image \
        "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server=${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:$COMMIT_SHA"
      kustomize edit set image \
        "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client=${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client:$COMMIT_SHA"

      # Git 커밋 & push → Config Sync가 변경 감지
      git config user.email "cloud-build@${PROJECT_ID}.iam.gserviceaccount.com"
      git config user.name "Cloud Build"
      git add kustomization.yaml
      git diff --staged --quiet || \
        git commit -m "chore(deploy): update image tag to $COMMIT_SHA [skip ci]"
      git push origin main

substitutions:
  _REGION: asia-northeast3

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: E2_HIGHCPU_8

images:
- "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:$COMMIT_SHA"
- "${_REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client:$COMMIT_SHA"
```

> `[skip ci]` 태그를 커밋 메시지에 포함해 매니페스트 업데이트 커밋이 빌드를 재트리거하지 않도록 한다.

---

## 5. GitHub Actions와 병행 사용 (선택)

Cloud Build가 GCP 내부 작업을 담당하고, GitHub Actions는 PR 단계의 검증(린트, 테스트)을 담당하는 혼합 구성도 가능하다.

```yaml
# .github/workflows/pr-check.yaml — PR 검증 전용
name: PR Check
on:
  pull_request:
    branches: [main]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v3
      with:
        version: 9
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter server typecheck
    - run: pnpm --filter client typecheck
```

main 머지 후 실제 빌드·배포는 Cloud Build 트리거가 담당한다.

---

## 6. 롤백 절차

### 방법 1 — git revert (권장)

```bash
# 배포 커밋 히스토리 확인
git log --oneline infra/overlays/production/kustomization.yaml

# 특정 커밋 revert
git revert <bad-commit-sha> --no-edit
git push origin main
# → Config Sync가 변경 감지 → 이전 이미지 태그로 RollingUpdate 자동 실행
```

### 방법 2 — gcloud CLI로 즉시 롤백

```bash
# 현재 Deployment 이미지 확인
kubectl get deployment server -n teacher-erp \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# 특정 이미지 태그로 즉시 변경 (Config Sync가 다음 sync에 revert하므로 임시 방편)
kubectl set image deployment/server \
  server=asia-northeast3-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:<previous-sha> \
  -n teacher-erp

# Config Sync가 원복하지 않도록 즉시 kustomization.yaml도 업데이트
```

---

## 7. 환경별 배포 전략

| 환경 | 브랜치 | Config Sync 디렉토리 | 트리거 |
|------|--------|---------------------|--------|
| Development | `develop` | `infra/overlays/development` | Cloud Build (develop 브랜치) |
| Production | `main` | `infra/overlays/production` | Cloud Build (main 브랜치) |

개발 환경은 GKE Autopilot의 `teacher-erp-dev` Namespace 또는 별도 클러스터에 배포한다.

---

## 8. Cloud Build 수동 트리거 (긴급 배포)

```bash
# 특정 커밋으로 수동 빌드 트리거
gcloud builds triggers run teacher-erp-deploy \
  --branch=main \
  --project=$PROJECT_ID

# 빌드 로그 실시간 확인
gcloud builds log <BUILD_ID> --stream \
  --project=$PROJECT_ID

# 최근 빌드 목록
gcloud builds list --limit=10 \
  --project=$PROJECT_ID \
  --format="table(id,status,createTime,finishTime)"
```

# GKE Autopilot 무중단 배포

> 관련 파일:  
> `docker-compose.yml` · `packages/app/server/src/index.ts`  
> `packages/app/server/Dockerfile` · `packages/app/client/Dockerfile`  
> `infra/base/` · `terraform/gke.tf`

---

## 1. GKE Autopilot 선택 이유

GKE Autopilot은 노드 프로비저닝·패치·스케일링을 Google이 완전 관리한다.  
직접 노드 풀을 관리하는 GKE Standard 대비 운영 부담이 대폭 줄어든다.

| 항목 | GKE Standard | GKE Autopilot |
|------|-------------|---------------|
| 노드 관리 | 직접 | Google 완전 관리 |
| 과금 단위 | 노드 VM | Pod 리소스 (requests) |
| 노드 보안 패치 | 직접 설정 | 자동 |
| 최소 비용 | 노드 상시 과금 | Pod 없으면 거의 0 |

---

## 2. Terraform — GKE Autopilot 클러스터

```hcl
# terraform/gke.tf

resource "google_container_cluster" "main" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  # Autopilot 모드
  enable_autopilot = true

  # VPC-native 클러스터 (Private Service Connect 필수)
  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.gke.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  release_channel {
    channel = "REGULAR"    # 안정적인 K8s 버전 자동 업그레이드
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Config Sync를 위한 Fleet 등록
  fleet {
    project = var.project_id
  }
}
```

```bash
# gcloud CLI로 동일한 클러스터 생성 (Terraform 없이 빠르게 시작할 때)
gcloud container clusters create-auto $CLUSTER_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --release-channel=regular \
  --workload-pool="${PROJECT_ID}.svc.id.goog"

# kubeconfig 업데이트
gcloud container clusters get-credentials $CLUSTER_NAME \
  --region=$REGION \
  --project=$PROJECT_ID
```

---

## 3. Artifact Registry — 이미지 저장소

```bash
# Artifact Registry 저장소 생성
gcloud artifacts repositories create teacher-erp \
  --repository-format=docker \
  --location=$REGION \
  --description="Teacher ERP container images"

# Docker 인증 설정
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# 이미지 주소 형식
# ${REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/server:${GIT_SHA}
# ${REGION}-docker.pkg.dev/${PROJECT_ID}/teacher-erp/client:${GIT_SHA}
```

---

## 4. Workload Identity — 키 파일 없는 Secret Manager 접근

Pod가 서비스 계정 JSON 키 파일 없이 Secret Manager에서 시크릿을 읽는다.

```bash
# GCP 서비스 계정 생성
gcloud iam service-accounts create teacher-erp-server \
  --display-name="Teacher ERP Server"

# Secret Manager 읽기 권한 부여
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:teacher-erp-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# K8s ServiceAccount ↔ GCP ServiceAccount 바인딩
gcloud iam service-accounts add-iam-policy-binding \
  "teacher-erp-server@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[teacher-erp/server]"
```

```yaml
# infra/base/server/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: server
  namespace: teacher-erp
  annotations:
    # Workload Identity 연결
    iam.gke.io/gcp-service-account: "teacher-erp-server@PROJECT_ID.iam.gserviceaccount.com"
```

---

## 5. Secret Manager → K8s Secret 동기화

Secret Manager의 값을 GKE Pod에 환경변수로 주입하기 위해  
**External Secrets Operator**를 사용한다.

```bash
# External Secrets Operator 설치
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-operator \
  --create-namespace
```

```yaml
# infra/base/server/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-store
  namespace: teacher-erp
spec:
  provider:
    gcpsm:
      projectID: "PROJECT_ID"   # Kustomize overlay에서 치환
      auth:
        workloadIdentity:
          clusterLocation: asia-northeast3
          clusterName: teacher-erp-cluster
          serviceAccountRef:
            name: server
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: teacher-erp-secrets
  namespace: teacher-erp
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: gcp-secret-store
    kind: SecretStore
  target:
    name: teacher-erp-secrets
    creationPolicy: Owner
  data:
  - secretKey: mongodb-uri
    remoteRef:
      key: mongodb-uri
      version: latest
  - secretKey: jwt-secret
    remoteRef:
      key: jwt-secret
      version: latest
```

---

## 6. 디렉토리 구조

```
infra/
├── base/
│   ├── namespace.yaml
│   ├── server/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── external-secret.yaml
│   │   └── hpa.yaml
│   ├── client/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── ingress.yaml
└── overlays/
    ├── development/
    │   ├── kustomization.yaml
    │   └── patches/replicas-dev.yaml
    └── production/
        ├── kustomization.yaml
        └── patches/replicas-prod.yaml

terraform/
├── main.tf
├── gke.tf
├── vpc.tf
├── mongodb-atlas.tf
├── atlas-private-endpoint.tf
├── artifact-registry.tf
└── variables.tf
```

---

## 7. Server Deployment

```yaml
# infra/base/server/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
  namespace: teacher-erp
  labels:
    app: server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 새 Pod를 먼저 올리고
      maxUnavailable: 0  # 기존 Pod는 새 Pod가 Ready 된 후에만 종료
  selector:
    matchLabels:
      app: server
  template:
    metadata:
      labels:
        app: server
    spec:
      serviceAccountName: server   # Workload Identity 연결

      # 서로 다른 GKE 노드(물리 호스트)에 분산 배치
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: server
              topologyKey: kubernetes.io/hostname

      containers:
      - name: server
        # Artifact Registry 이미지 주소
        image: asia-northeast3-docker.pkg.dev/PROJECT_ID/teacher-erp/server:latest
        ports:
        - containerPort: 3001
          name: http

        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3001"
        # External Secrets Operator가 동기화한 K8s Secret에서 읽음
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: teacher-erp-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: teacher-erp-secrets
              key: jwt-secret
        - name: CLIENT_ORIGIN
          valueFrom:
            configMapKeyRef:
              name: teacher-erp-config
              key: client-origin

        # Readiness: DB ping 포함 → 실패 시 Service 엔드포인트에서 제외
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3

        # Liveness: 프로세스 응답 여부만 → 실패 시 Pod 재시작
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 15
          periodSeconds: 20
          failureThreshold: 3

        # SIGTERM 전 5초 대기 — 진행 중인 요청 drain
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]

        # GKE Autopilot은 requests 기준으로 노드를 프로비저닝함
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      terminationGracePeriodSeconds: 30
```

---

## 8. Client Deployment

```yaml
# infra/base/client/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client
  namespace: teacher-erp
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: client
  template:
    metadata:
      labels:
        app: client
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: client
              topologyKey: kubernetes.io/hostname
      containers:
      - name: client
        image: asia-northeast3-docker.pkg.dev/PROJECT_ID/teacher-erp/client:latest
        ports:
        - containerPort: 80
          name: http
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 3
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 20
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "200m"
```

### Client Dockerfile — Nginx 정적 서빙

```dockerfile
# packages/app/client/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/app/client/package.json packages/app/client/
COPY packages/shared/ packages/shared/
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/app/client/ packages/app/client/
RUN pnpm --filter client build

FROM nginx:alpine
COPY --from=builder /app/packages/app/client/dist /usr/share/nginx/html
COPY packages/app/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# packages/app/client/nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;   # React Router SPA fallback
  }

  location /api/ {
    proxy_pass http://server:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## 9. GKE Ingress — Google-managed TLS

GKE Ingress는 Cloud Load Balancing과 자동 연동되며, Google-managed Certificate로 TLS를 자동 발급한다. cert-manager 설치가 필요 없다.

```yaml
# infra/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: teacher-erp-ingress
  namespace: teacher-erp
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "teacher-erp-ip"  # 아래 gcloud 명령으로 생성
    networking.gke.io/managed-certificates: "teacher-erp-cert"
    networking.gke.io/v1beta1.FrontendConfig: "teacher-erp-frontend"
spec:
  rules:
  - host: erp.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: server
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: client
            port:
              number: 80
---
# Google-managed TLS 인증서
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: teacher-erp-cert
  namespace: teacher-erp
spec:
  domains:
  - erp.example.com
---
# HTTPS 리다이렉트
apiVersion: networking.gke.io/v1beta1
kind: FrontendConfig
metadata:
  name: teacher-erp-frontend
  namespace: teacher-erp
spec:
  redirectToHttps:
    enabled: true
```

```bash
# 고정 외부 IP 생성 (Ingress에서 참조)
gcloud compute addresses create teacher-erp-ip \
  --global \
  --project=$PROJECT_ID
```

---

## 10. HPA — Cloud Monitoring 기반 오토스케일링

```yaml
# infra/base/server/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: server-hpa
  namespace: teacher-erp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # 시험 기간 후 급격한 스케일다운 방지
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
```

---

## 11. Kustomize Overlay

```yaml
# infra/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: teacher-erp
resources:
- ../../base
patches:
- path: patches/replicas-prod.yaml
  target:
    kind: Deployment
    name: server
images:
- name: asia-northeast3-docker.pkg.dev/PROJECT_ID/teacher-erp/server
  newTag: "GIT_SHA_PLACEHOLDER"   # Cloud Build가 git SHA로 업데이트
- name: asia-northeast3-docker.pkg.dev/PROJECT_ID/teacher-erp/client
  newTag: "GIT_SHA_PLACEHOLDER"
configMapGenerator:
- name: teacher-erp-config
  literals:
  - client-origin=https://erp.example.com
  - node-env=production
```

```yaml
# infra/overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: teacher-erp-dev
resources:
- ../../base
patches:
- path: patches/replicas-dev.yaml
configMapGenerator:
- name: teacher-erp-config
  literals:
  - client-origin=http://localhost:5173
  - node-env=development
```

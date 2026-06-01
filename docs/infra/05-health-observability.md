# 헬스체크 & 가시성 (Observability on GCP)

> 관련 파일:  
> `packages/app/server/src/index.ts`  
> `infra/base/server/deployment.yaml`

---

## 1. GCP Observability 스택

GKE는 Cloud Logging과 Cloud Monitoring에 자동으로 연동된다.  
별도의 에이전트 설치나 사이드카 없이 `stdout`/`stderr`로 출력한 로그가 Cloud Logging에 수집된다.

| 역할 | 기존 | GCP 대체 |
|------|------|---------|
| 로그 수집 | Loki / ELK | **Cloud Logging** (자동) |
| 메트릭 수집 | Prometheus | **Cloud Monitoring** |
| 대시보드 | Grafana | **Cloud Monitoring 대시보드** |
| 분산 추적 | Jaeger | **Cloud Trace** |
| 알림 | AlertManager | **Cloud Monitoring Alerting** |

---

## 2. 헬스체크 엔드포인트

현재 `index.ts:33`의 `/health`는 MongoDB 상태를 반영하지 않아 Readiness Probe가 실질적으로 무의미하다.

```typescript
// 현재 (index.ts:33)
app.get('/health', (_req, res) => {
  res.json({ ok: true });  // Atlas 다운이어도 200 반환
});
```

### 목표 코드

Readiness와 Liveness를 분리한다.

```typescript
// packages/app/server/src/index.ts
import mongoose from 'mongoose';

const startTime = Date.now();

// Readiness — DB 연결 포함 확인. 실패 시 Service 엔드포인트에서 Pod 제외
app.get('/health/ready', async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) {
    return res.status(503).json({
      status: 'not_ready',
      checks: { db: 'disconnected' },
    });
  }

  try {
    await mongoose.connection.db!.admin().ping();
  } catch {
    return res.status(503).json({
      status: 'not_ready',
      checks: { db: 'ping_failed' },
    });
  }

  res.json({
    status: 'ready',
    checks: { db: 'connected' },
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

// Liveness — 프로세스 자체 응답성만 확인. 실패 시 Pod 재시작
app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive', uptime: Math.floor((Date.now() - startTime) / 1000) });
});

// 하위 호환 유지
app.get('/health', (_req, res) => res.json({ ok: true }));
```

---

## 3. Cloud Logging — 구조화 로깅

GKE Pod의 `stdout`은 Cloud Logging 에이전트가 자동으로 수집한다.  
JSON 형식으로 출력하면 Cloud Logging이 필드를 파싱해 검색·필터링이 가능해진다.

Cloud Logging이 인식하는 특별 필드:
- `severity` → 로그 심각도 (INFO, WARNING, ERROR 등)
- `message` → 메인 메시지
- `httpRequest` → HTTP 요청 구조체 (자동 Cloud Trace 연동)
- `logging.googleapis.com/trace` → 분산 추적 연결

```typescript
// packages/app/server/src/utils/logger.ts
const isDev = process.env.NODE_ENV !== 'production';

type Severity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

function log(
  severity: Severity,
  message: string,
  meta?: Record<string, unknown>,
) {
  if (isDev) {
    const method = severity === 'ERROR' ? 'error'
      : severity === 'WARNING' ? 'warn'
      : 'log';
    console[method](`[${severity}] ${message}`, meta ?? '');
    return;
  }

  // Cloud Logging이 파싱하는 구조화 JSON
  const entry = {
    severity,
    message,
    service: 'teacher-erp-server',
    timestamp: new Date().toISOString(),
    ...meta,
  };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('DEBUG', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => log('INFO', msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('WARNING', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('ERROR', msg, meta),
};
```

### 요청 로깅 미들웨어

```typescript
// packages/app/server/src/middleware/requestLogger.ts
import { logger } from '../utils/logger.js';
import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startAt = Date.now();
  const traceHeader = req.headers['x-cloud-trace-context'] as string | undefined;

  res.on('finish', () => {
    logger.info('HTTP request', {
      // Cloud Logging의 httpRequest 구조체 — Cloud Trace와 자동 연동
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: res.statusCode,
        latency: `${(Date.now() - startAt) / 1000}s`,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip,
      },
      // Cloud Trace 연결
      'logging.googleapis.com/trace': traceHeader
        ? `projects/${process.env.GCP_PROJECT_ID}/traces/${traceHeader.split('/')[0]}`
        : undefined,
      user_id: req.authUser?._id,
      role: req.authUser?.role,
    });
  });

  next();
}
```

---

## 4. Cloud Trace — 분산 추적

GKE에서 `@google-cloud/trace-agent`를 사용하면 MongoDB 쿼리, 외부 API 호출 등이 자동으로 추적된다.

```bash
pnpm --filter server add @google-cloud/trace-agent
```

```typescript
// packages/app/server/src/index.ts — 반드시 최상단 첫 번째 import
import '@google-cloud/trace-agent/build/src/index.js';

// 이후 나머지 import
import express from 'express';
// ...
```

로컬 개발에서는 추적이 비활성화되므로 `NODE_ENV !== 'production'`이면 자동으로 no-op 처리된다.

---

## 5. Cloud Monitoring — 알림 정책

```bash
# CPU 사용률 70% 초과 시 Slack/이메일 알림
gcloud monitoring policies create \
  --notification-channels="projects/$PROJECT_ID/notificationChannels/CHANNEL_ID" \
  --display-name="Teacher ERP — High CPU" \
  --condition-filter='resource.type="k8s_container" AND resource.labels.namespace_name="teacher-erp" AND metric.type="kubernetes.io/container/cpu/request_utilization"' \
  --condition-threshold-value=0.7 \
  --condition-threshold-duration=300s \
  --condition-comparison=COMPARISON_GT \
  --project=$PROJECT_ID
```

Terraform으로 선언적 관리:

```hcl
# terraform/monitoring.tf

resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "Teacher ERP — High CPU"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "CPU request utilization > 70%"
    condition_threshold {
      filter = <<-EOT
        resource.type = "k8s_container"
        AND resource.labels.namespace_name = "teacher-erp"
        AND metric.type = "kubernetes.io/container/cpu/request_utilization"
      EOT
      comparison      = "COMPARISON_GT"
      threshold_value = 0.7
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.slack.name]
  severity              = "WARNING"
}

resource "google_monitoring_alert_policy" "pod_not_ready" {
  display_name = "Teacher ERP — Pod Not Ready"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Readiness check failing"
    condition_threshold {
      filter = <<-EOT
        resource.type = "k8s_pod"
        AND resource.labels.namespace_name = "teacher-erp"
        AND metric.type = "kubernetes.io/pod/volume/used_bytes"
      EOT
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "120s"
    }
  }

  notification_channels = [google_monitoring_notification_channel.slack.name]
  severity              = "CRITICAL"
}

resource "google_monitoring_notification_channel" "slack" {
  display_name = "Slack Deploy Alerts"
  type         = "slack"
  project      = var.project_id
  labels = {
    channel_name = "#deploy-alerts"
    auth_token   = data.google_secret_manager_secret_version.slack_token.secret_data
  }
}
```

---

## 6. 에러 핸들링 미들웨어

```typescript
// packages/app/server/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    path: req.path,
    user_id: req.authUser?._id,
  });

  if ((err as NodeJS.ErrnoException).code === '11000') {
    return res.status(409).json({ message: 'Duplicate entry' });
  }

  res.status(500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

// index.ts 마지막에 등록 (모든 라우터 뒤)
// app.use(errorHandler);
```

---

## 7. Graceful Shutdown

GKE가 Pod 종료 시 SIGTERM → `terminationGracePeriodSeconds` 경과 → SIGKILL 순서로 진행한다.  
SIGTERM을 수신했을 때 진행 중인 요청을 완료하고 MongoDB Atlas 연결을 정상 종료한다.

```typescript
// packages/app/server/src/index.ts
const server = app.listen(port, () => {
  logger.info(`Teacher ERP API listening on port ${port}`);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  server.close(async () => {
    logger.info('HTTP server closed');
    await mongoose.connection.close();
    logger.info('MongoDB Atlas connection closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 8. Cloud Logging 로그 조회

```bash
# 최근 1시간 ERROR 로그
gcloud logging read \
  'resource.type="k8s_container" AND resource.labels.namespace_name="teacher-erp" AND severity=ERROR' \
  --limit=50 \
  --freshness=1h \
  --project=$PROJECT_ID \
  --format="table(timestamp,jsonPayload.message,jsonPayload.user_id)"

# 특정 사용자 관련 로그 추적
gcloud logging read \
  'resource.type="k8s_container" AND jsonPayload.user_id="USER_ID"' \
  --limit=100 \
  --project=$PROJECT_ID

# MongoDB 연결 오류만 필터
gcloud logging read \
  'resource.type="k8s_container" AND jsonPayload.message=~"MongoDB"' \
  --project=$PROJECT_ID
```

---

## 9. 체크리스트

| 항목 | 현재 상태 | 목표 |
|------|-----------|------|
| `/health` — DB ping 포함 | 미반영 | `/health/ready` 분리 |
| Readiness Probe | 단순 OK | Atlas ping 반영 |
| 구조화 로깅 | `console.log` | Cloud Logging JSON |
| 분산 추적 | 없음 | Cloud Trace |
| 중앙 에러 핸들러 | 미구성 | `errorHandler` 미들웨어 |
| Graceful Shutdown | 미구성 | SIGTERM 핸들러 |
| CPU/Pod 알림 | 없음 | Cloud Monitoring 알림 정책 |

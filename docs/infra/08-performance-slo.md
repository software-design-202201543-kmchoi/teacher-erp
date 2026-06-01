# 성능 SLO (SD2-25)

## 목표 응답 시간

| API 유형 | 목표 | 측정 기준 |
|---------|------|----------|
| 학생 목록 / 성적 목록 조회 | < 200ms | p95 |
| 학생 상세 / 성적 상세 | < 300ms | p95 |
| 보고서 JSON 생성 | < 800ms | p95 |
| OLAP 스냅샷 조회 | < 300ms | p95 |
| 감사로그 / 보안 이벤트 조회 | < 500ms | p95 |

## 동시성 기준

- 기준: 동시 20 사용자 (교사 10 + 학생/학부모 10)
- ECS 태스크 1개(1 vCPU / 512MB)로 처리
- 초과 시 대응: ALB + ECS Auto Scaling (MinCapacity=1, MaxCapacity=3, CPU 70% 기준)

## 인덱스 현황

| 컬렉션 | 인덱스 | 용도 |
|--------|--------|------|
| grades | `{ student_id, subject_id, teacher_id, term }` unique | 성적 중복 방지, 학생별 조회 |
| feedbacks | `{ student_id, createdAt }` | 학생별 피드백 목록 |
| feedbacks | `{ teacher_id, createdAt }` | 교사별 피드백 목록 |
| feedbacks | `{ student_id, visibility }` | 공개 범위별 필터 |
| counselingrecords | `{ student_id, counsel_date }` | 학생별 상담 날짜순 조회 |
| counselingrecords | `{ teacher_id, counsel_date }` | 교사별 상담 조회 |
| counselingrecords | `{ student_id, is_shared }` | 공유 상담 필터 |
| auditlogs | `{ student_id, occurred_at }` | 학생별 변경 이력 조회 |
| securityevents | `{ type, occurred_at }` | 보안 이벤트 타입별 조회 |
| student_learning_snapshots | `{ student_id, term }` unique | OLAP 스냅샷 조회 |

## 모니터링

- **CloudWatch Logs Insights** — `accessLog` 기반 p95 응답 시간 쿼리:
  ```
  fields duration_ms, path, method, status
  | filter type = "http_access"
  | stats pct(duration_ms, 95) as p95 by path
  | sort p95 desc
  | limit 20
  ```
- **ECS 메트릭**: CPU Utilization, Memory Utilization (CloudWatch 기본 제공)
- **ALB 메트릭**: TargetResponseTime, RequestCount, HTTPCode_Target_5XX_Count

## 성능 허용 기준

권한 검증(CASL ability check)은 인메모리 연산으로 추가 지연이 < 1ms이므로 SLO 기준에 영향을 주지 않는다.

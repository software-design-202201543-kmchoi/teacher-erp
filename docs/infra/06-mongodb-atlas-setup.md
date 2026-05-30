# MongoDB Atlas 설정 (프로덕션)

## 왜 Atlas인가

OLAP 파이프라인은 MongoDB **Change Streams**를 사용한다. Change Streams는 oplog가 있는 환경—Replica Set 또는 Sharded Cluster—에서만 동작한다.

| 옵션 | Change Streams | 비용 | 운영 부담 |
|------|---------------|------|-----------|
| EC2 self-hosted RS | ✓ | EC2 인스턴스 비용 | 패치·백업·모니터링 직접 관리 |
| Atlas M0 (free) | ✓ | 무료 | Atlas가 RS·백업·보안 관리 |
| Atlas M10 | ✓ | ~$57/월 | 위와 동일, 트래픽 더 많을 때 |
| Standalone mongod | ✗ | EC2 비용 | — |

**Atlas M0(무료)**를 사용한다. 512MB 스토리지 제한이 있지만 데모·과제 규모에는 충분하다.

---

## 1단계 — Atlas 클러스터 생성

1. [cloud.mongodb.com](https://cloud.mongodb.com) 접속 → 무료 계정 생성 또는 로그인
2. **New Project** → 이름: `teacher-erp`
3. **Build a Database** → **M0 Free** 선택
4. Provider: **AWS** / Region: **ap-northeast-2 (Seoul)**
5. Cluster 이름: `teacher-erp-prod`
6. **Create** 클릭

---

## 2단계 — DB 사용자 생성

**Database Access** → **Add New Database User**

| 항목 | 값 |
|------|----|
| Authentication | Password |
| Username | `teacher-erp-app` |
| Password | 강력한 랜덤 문자열 (기록해둘 것) |
| Built-in Role | **Read and write to any database** |

---

## 3단계 — 네트워크 접근 허용

**Network Access** → **Add IP Address**

- **개발 중**: "Allow Access from Anywhere" (`0.0.0.0/0`) — 임시로 허용
- **프로덕션**: ECS 태스크의 NAT Gateway 탄력적 IP만 허용

NAT Gateway EIP 확인:
```bash
aws ec2 describe-nat-gateways \
  --filter "Name=tag:Project,Values=teacher-erp" \
  --query "NatGateways[].NatGatewayAddresses[].PublicIp" \
  --output text
```

---

## 4단계 — 연결 문자열 확보

Atlas 콘솔 → **Connect** → **Drivers** → Driver: `Node.js` → 버전: `6.x`

연결 문자열 형식:
```
mongodb+srv://teacher-erp-app:<password>@teacher-erp-prod.xxxxx.mongodb.net/teacher_erp
```

**Change Streams는 M0에서 자동으로 지원된다** (Atlas 클러스터는 항상 RS).

---

## 5단계 — AWS SSM에 연결 문자열 저장

Terraform이 이미 `/teacher-erp/MONGODB_URI` SSM 파라미터를 `PLACEHOLDER`로 생성해 뒀다. 실제 값으로 덮어쓴다:

```bash
aws ssm put-parameter \
  --name /teacher-erp/MONGODB_URI \
  --value "mongodb+srv://teacher-erp-app:<password>@teacher-erp-prod.xxxxx.mongodb.net/teacher_erp" \
  --type SecureString \
  --overwrite \
  --region ap-northeast-2
```

ECS 태스크 정의의 `secrets` 블록이 이 파라미터를 `MONGODB_URI` 환경변수로 주입한다 (`terraform/ecs.tf` 참고).

---

## 6단계 — 배포 및 확인

```bash
# ECS 서비스 재배포 (새 태스크로 교체)
aws ecs update-service \
  --cluster teacher-erp \
  --service teacher-erp-server \
  --force-new-deployment \
  --region ap-northeast-2

# 서버 로그에서 확인
aws logs tail /teacher-erp/server --follow --region ap-northeast-2
```

정상 시 로그:
```
[db] Connected: mongodb+srv://<credentials>@teacher-erp-prod.xxxxx.mongodb.net/teacher_erp
[seed] Loaded 8 grades, 5 feedbacks, 3 counseling records
[OLAP] Bootstrap analytics complete
[OLAP] Change Streams active on grades, feedbacks, counselingrecords
Teacher ERP API listening on port 3001
```

---

## 로컬 개발 모드 요약

| 실행 방법 | MongoDB | Change Streams |
|-----------|---------|----------------|
| `docker compose up` | 컨테이너 RS (`--replSet rs0`) | ✓ 실제 RS |
| `pnpm dev` (Docker 없이) | MongoMemoryReplSet (in-process) | ✓ 실제 RS |
| `MONGODB_URI=... pnpm dev` | Atlas 또는 로컬 RS | ✓ 실제 RS |

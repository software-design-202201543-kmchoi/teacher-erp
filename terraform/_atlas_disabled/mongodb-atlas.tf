# MongoDB Atlas on GCP — M10 이상에서 트랜잭션 지원
# 인증: MONGODB_ATLAS_PUBLIC_KEY / MONGODB_ATLAS_PRIVATE_KEY 환경변수

resource "mongodbatlas_project" "teacher_erp" {
  name   = "teacher-erp"
  org_id = var.atlas_org_id
}

# 기본(공유) Atlas 클러스터 — 멀티테넌시 전략 B(Namespace 분리) 시 사용
resource "mongodbatlas_advanced_cluster" "main" {
  project_id   = mongodbatlas_project.teacher_erp.id
  name         = "teacher-erp-prod"
  cluster_type = "REPLICASET"

  replication_specs {
    region_configs {
      provider_name = "GCP"
      region_name   = "ASIA_NORTHEAST_3"  # 서울
      priority      = 7

      electable_specs {
        instance_size = var.atlas_instance_size  # M10 이상 (트랜잭션 지원)
        node_count    = 3                         # Primary 1 + Secondary 2
      }

      # 분석 쿼리 전용 노드 — 운영 성능에 영향 없이 보고서 쿼리 처리
      analytics_specs {
        instance_size = var.atlas_instance_size
        node_count    = 1
      }
    }
  }

  backup_enabled = true
  pit_enabled    = true  # Point-in-time 복구 활성화

  advanced_configuration {
    javascript_enabled           = false
    minimum_enabled_tls_protocol = "TLS1_2"
    # 느린 쿼리 임계값 100ms — Atlas Performance Advisor 연동
    slow_op_threshold_ms         = 100
  }
}

# 자동 백업 정책
resource "mongodbatlas_cloud_backup_schedule" "main" {
  project_id   = mongodbatlas_project.teacher_erp.id
  cluster_name = mongodbatlas_advanced_cluster.main.name

  reference_hour_of_day    = 3  # KST 새벽 3시 (UTC 18:00)
  reference_minute_of_hour = 0

  policy_item_hourly {
    frequency_interval = 6        # 6시간마다
    retention_unit     = "days"
    retention_value    = 7        # 7일 보관
  }

  policy_item_daily {
    frequency_interval = 1        # 매일
    retention_unit     = "days"
    retention_value    = 14       # 14일 보관
  }

  policy_item_weekly {
    frequency_interval = 6        # 토요일
    retention_unit     = "weeks"
    retention_value    = 4        # 4주 보관
  }

  policy_item_monthly {
    frequency_interval = 40       # 매월 마지막 날
    retention_unit     = "months"
    retention_value    = 3        # 3개월 보관
  }
}

# Atlas 연결 문자열을 Secret Manager에 저장
resource "google_secret_manager_secret" "mongodb_uri" {
  secret_id = "mongodb-uri"
  project   = var.project_id
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [mongodbatlas_advanced_cluster.main]
}

resource "google_secret_manager_secret_version" "mongodb_uri" {
  secret      = google_secret_manager_secret.mongodb_uri.id
  secret_data = mongodbatlas_advanced_cluster.main.connection_strings[0].standard_srv
}

# JWT 시크릿 — 초기 버전은 수동으로 등록 후 Terraform이 관리
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "jwt-secret"
  project   = var.project_id
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

# 멀티테넌시 — 학교별 리소스 자동 프로비저닝
# 새 학교 추가: locals.schools 에 항목을 추가하고 terraform apply 실행

locals {
  schools = {
    "school-001" = {
      domain      = "school001.erp.example.com"  # TODO: 실제 도메인으로 변경
      atlas_tier  = "M10"
      server_replicas = 3
    }
    "school-002" = {
      domain      = "school002.erp.example.com"  # TODO: 실제 도메인으로 변경
      atlas_tier  = "M10"
      server_replicas = 2
    }
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

  depends_on = [google_container_cluster.main]
}

# 학교별 ResourceQuota — 한 학교가 클러스터 자원을 독점하지 못하게 제한
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

# 학교별 MongoDB Atlas 클러스터 (데이터 완전 분리)
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

  advanced_configuration {
    javascript_enabled           = false
    minimum_enabled_tls_protocol = "TLS1_2"
    slow_op_threshold_ms         = 100
  }
}

# 학교별 Atlas 연결 문자열 → Secret Manager (키: mongodb-uri-school-001 등)
resource "google_secret_manager_secret" "school_mongodb_uri" {
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

  depends_on = [mongodbatlas_advanced_cluster.school]
}

resource "google_secret_manager_secret_version" "school_mongodb_uri" {
  for_each = local.schools

  secret      = google_secret_manager_secret.school_mongodb_uri[each.key].id
  secret_data = mongodbatlas_advanced_cluster.school[each.key].connection_strings[0].standard_srv
}

# 학교별 GKE Namespace에 Workload Identity ServiceAccount IAM 바인딩
resource "google_service_account_iam_member" "school_workload_identity" {
  for_each = local.schools

  service_account_id = google_service_account.server.name
  role               = "roles/iam.workloadIdentityUser"
  # 각 학교 Namespace의 K8s ServiceAccount
  member = "serviceAccount:${var.project_id}.svc.id.goog[${each.key}-erp/server]"
}

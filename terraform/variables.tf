variable "aws_region" {
  description = "AWS 리전 (서울)"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "프로젝트 이름 (리소스 네이밍에 사용)"
  type        = string
  default     = "teacher-erp"
}

variable "domain" {
  description = "서비스 도메인 (CloudFront + ACM + Route 53에서 사용)"
  type        = string
  default     = "teacher-erp.kimwash.xyz"
}

variable "github_repo_owner" {
  description = "GitHub 저장소 소유자 (OIDC Role Condition에 사용)"
  type        = string
  default     = "software-design-202201543-kmchoi"
}

variable "github_repo_name" {
  description = "GitHub 저장소 이름"
  type        = string
  default     = "teacher-erp"
}

variable "server_cpu" {
  description = "서버 Fargate 태스크 CPU 단위 (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "server_memory" {
  description = "서버 Fargate 태스크 메모리 (MiB)"
  type        = number
  default     = 512
}

variable "server_desired_count" {
  description = "서버 ECS 서비스 태스크 수"
  type        = number
  default     = 2
}

# MongoDB Atlas 연결 정보 — Atlas 활성화 후 설정
variable "atlas_org_id" {
  description = "MongoDB Atlas 조직 ID"
  type        = string
  sensitive   = true
  default     = ""
}

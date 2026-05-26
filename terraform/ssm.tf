# SSM Parameter Store — 비용 절감: Secrets Manager($0.40/secret/month) 대신 SSM 사용
# Standard Parameter는 무료, KMS 기본 키 암호화도 추가 비용 없음

resource "aws_ssm_parameter" "mongodb_uri" {
  name        = "/${var.project_name}/MONGODB_URI"
  description = "MongoDB Atlas 연결 문자열"
  type        = "SecureString"
  value       = "PLACEHOLDER"

  # 실제 값은 배포 후 아래 명령어로 설정:
  # aws ssm put-parameter --name /teacher-erp/MONGODB_URI \
  #   --value "mongodb+srv://..." --type SecureString --overwrite
  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/JWT_SECRET"
  description = "JWT 서명 키"
  type        = "SecureString"
  value       = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

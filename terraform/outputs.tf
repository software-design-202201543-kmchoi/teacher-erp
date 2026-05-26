output "alb_dns_name" {
  description = "ALB DNS 이름 — 도메인 등록기관에서 CNAME으로 등록"
  value       = aws_lb.main.dns_name
}

output "ecr_server_url" {
  description = "서버 ECR URL (GitHub Actions 이미지 push)"
  value       = aws_ecr_repository.server.repository_url
}

output "ecr_client_url" {
  description = "클라이언트 ECR URL (GitHub Actions 이미지 push)"
  value       = aws_ecr_repository.client.repository_url
}

output "github_actions_role_arn" {
  description = "GitHub Actions OIDC 역할 ARN — GitHub Secrets에 AWS_DEPLOY_ROLE_ARN으로 등록"
  value       = aws_iam_role.github_actions.arn
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_server_service" {
  value = aws_ecs_service.server.name
}

output "ecs_client_service" {
  value = aws_ecs_service.client.name
}

output "sns_alerts_arn" {
  description = "SNS 알람 토픽 ARN (이메일 구독 추가 시 사용)"
  value       = aws_sns_topic.alerts.arn
}

output "dns_setup" {
  description = "도메인 설정 안내"
  value       = "도메인 등록기관에서 teacher-erp.kimwash.xyz → CNAME → ${aws_lb.main.dns_name}"
}

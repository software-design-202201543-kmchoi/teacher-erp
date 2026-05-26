# ECR — 서버 이미지 저장소
resource "aws_ecr_repository" "server" {
  name                 = "${var.project_name}/server"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Service = "server" }
}

# ECR — 클라이언트 이미지 저장소
resource "aws_ecr_repository" "client" {
  name                 = "${var.project_name}/client"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Service = "client" }
}

# 비용 절감: 최근 10개 이미지만 유지
locals {
  lifecycle_policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "최근 10개 이미지만 유지"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "server" {
  repository = aws_ecr_repository.server.name
  policy     = local.lifecycle_policy
}

resource "aws_ecr_lifecycle_policy" "client" {
  repository = aws_ecr_repository.client.name
  policy     = local.lifecycle_policy
}

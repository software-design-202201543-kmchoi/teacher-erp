# MongoDB Atlas PrivateLink — AWS VPC 내부에서 Atlas 접근
# GCP PSC 대신 AWS PrivateLink 사용 (퍼블릭 인터넷 우회, 레이턴시 감소)
#
# 활성화 방법:
#   1. mongodb-atlas.tf에서 provider_name = "AWS", region_name = "AP_NORTHEAST_2" 로 변경
#   2. main.tf에서 mongodbatlas provider 주석 해제
#   3. Atlas API 키 환경변수 설정:
#      export MONGODB_ATLAS_PUBLIC_KEY=...
#      export MONGODB_ATLAS_PRIVATE_KEY=...

# Atlas 측 PrivateLink 엔드포인트 생성 요청
resource "mongodbatlas_privatelink_endpoint" "main" {
  project_id    = mongodbatlas_project.teacher_erp.id
  provider_name = "AWS"
  region        = "AP_NORTHEAST_2"  # 서울 (Atlas 리전 코드)
}

# AWS VPC Endpoint (Interface 타입) — Atlas Service에 연결
resource "aws_vpc_endpoint" "atlas" {
  vpc_id             = aws_vpc.main.id
  service_name       = mongodbatlas_privatelink_endpoint.main.endpoint_service_name
  vpc_endpoint_type  = "Interface"
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.atlas_endpoint.id]

  tags = { Name = "teacher-erp-atlas-endpoint" }
}

# Atlas VPC Endpoint 전용 보안 그룹
resource "aws_security_group" "atlas_endpoint" {
  name_prefix = "teacher-erp-atlas-ep-"
  vpc_id      = aws_vpc.main.id
  description = "MongoDB Atlas PrivateLink endpoint"

  ingress {
    description     = "MongoDB from ECS tasks"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle { create_before_destroy = true }
}

# Atlas 측에서 AWS VPC Endpoint를 수락 (양방향 핸드셰이크)
resource "mongodbatlas_privatelink_endpoint_service" "main" {
  project_id          = mongodbatlas_privatelink_endpoint.main.project_id
  private_link_id     = mongodbatlas_privatelink_endpoint.main.private_link_id
  provider_name       = "AWS"
  endpoint_service_id = aws_vpc_endpoint.atlas.id

  depends_on = [aws_vpc_endpoint.atlas]
}

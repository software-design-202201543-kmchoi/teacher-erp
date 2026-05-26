# CloudWatch 로그 그룹 — 비용 절감: 30일 보존
resource "aws_cloudwatch_log_group" "client" {
  name              = "/ecs/${var.project_name}/client"
  retention_in_days = 30
  tags = { Service = "client" }
}

resource "aws_cloudwatch_log_group" "server" {
  name              = "/ecs/${var.project_name}/server"
  retention_in_days = 30

  tags = { Service = "server" }
}

# SNS 토픽 — 알람 → 이메일/Slack
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

locals {
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CPU 사용률 70% 초과 경고
resource "aws_cloudwatch_metric_alarm" "server_cpu_high" {
  alarm_name          = "${var.project_name}-server-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "서버 ECS CPU 사용률 70% 5분간 초과"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.server.name
  }

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions
}

# ALB 5xx 에러율 경고
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project_name}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx 에러 10건 초과"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = local.alarm_actions
}

# ECS 실행 중인 태스크 0개 (서비스 중단)
resource "aws_cloudwatch_metric_alarm" "server_task_zero" {
  alarm_name          = "${var.project_name}-server-task-zero"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "서버 ECS 태스크 없음 — 서비스 중단"
  treat_missing_data  = "breaching"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.server.name
  }

  alarm_actions = local.alarm_actions
}

# CloudWatch 대시보드
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = var.project_name

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "서버 CPU 사용률 (%)"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.project_name, "ServiceName", "${var.project_name}-server"]
          ]
          period = 60
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "서버 메모리 사용률 (%)"
          region = var.aws_region
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.project_name, "ServiceName", "${var.project_name}-server"]
          ]
          period = 60
          stat   = "Average"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "ALB 요청 수 / 5xx 에러"
          region = var.aws_region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount",              "LoadBalancer", "${aws_lb.main.arn_suffix}"],
            [".",                  "HTTPCode_Target_5XX_Count", ".",             "."],
          ]
          period = 60
          stat   = "Sum"
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "ECS 실행 태스크 수"
          region = var.aws_region
          metrics = [
            ["ECS/ContainerInsights", "RunningTaskCount", "ClusterName", var.project_name, "ServiceName", "${var.project_name}-server"]
          ]
          period = 60
          stat   = "Average"
          view   = "timeSeries"
        }
      },
    ]
  })
}

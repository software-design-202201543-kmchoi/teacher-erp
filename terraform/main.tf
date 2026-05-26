terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 사전 생성 필요 (아래 명령어):
  #   aws s3api create-bucket --bucket teacher-erp-ckm-tfstate \
  #     --region ap-northeast-2 \
  #     --create-bucket-configuration LocationConstraint=ap-northeast-2
  #   aws s3api put-bucket-versioning --bucket teacher-erp-ckm-tfstate \
  #     --versioning-configuration Status=Enabled
  #   aws dynamodb create-table --table-name teacher-erp-tflock \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST --region ap-northeast-2
  backend "s3" {
    bucket       = "teacher-erp-ckm-tfstate"
    key          = "terraform/state"
    region       = "ap-northeast-2"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "teacher-erp"
      ManagedBy = "terraform"
    }
  }
}

# CloudFront ACM 인증서는 반드시 us-east-1에 생성해야 함
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "teacher-erp"
      ManagedBy = "terraform"
    }
  }
}

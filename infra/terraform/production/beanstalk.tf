# ==============================================
# Elastic Beanstalk Application
# ==============================================
resource "aws_elastic_beanstalk_application" "app" {
  name        = var.app_name
  description = "Credcars backend application"
}

# ==============================================
# Elastic Beanstalk Application Version (from S3)
# ==============================================
resource "random_id" "bucket_suffix" {
  byte_length = 3
}

resource "aws_s3_bucket" "beanstalk_app_bucket" {
  bucket = "credcars-beanstalk-${var.env}-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_object" "app_version" {
  bucket = aws_s3_bucket.beanstalk_app_bucket.id
  key    = "app-${var.env}.zip"
  source = "${path.module}/${var.app_zip_path}"
  etag   = filemd5("${path.module}/${var.app_zip_path}")



}

resource "aws_elastic_beanstalk_application_version" "version" {
  name        = "v1-${var.env}"
  application = aws_elastic_beanstalk_application.app.name
  bucket      = aws_s3_bucket.beanstalk_app_bucket.bucket
  key         = aws_s3_object.app_version.key
}

# ==============================================
# Elastic Beanstalk Environment
# ==============================================
resource "aws_elastic_beanstalk_environment" "env" {
  name        = "${var.app_name}-${var.env}-env"
  application = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2023 v6.6.6 running Node.js 20"

  version_label = aws_elastic_beanstalk_application_version.version.name

  depends_on = [
    aws_iam_instance_profile.eb_ec2_instance_profile,
    aws_iam_role.eb_service_role
  ]

  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = "vpc-0832ca0176106f346"
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = "subnet-045226bc21fc9c17d,subnet-05d56b7fe52566bb8,subnet-061eafe383403eb63"
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = "subnet-045226bc21fc9c17d,subnet-05d56b7fe52566bb8,subnet-061eafe383403eb63"
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "AssociatePublicIpAddress"
    value     = "true"
  }

  # === IAM & Instance Settings ===
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb_ec2_instance_profile.name
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.eb_service_role.arn
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.instance_type
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "IpAddressType"
    value     = "ipv4"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = var.load_balancer_type
  }

  # === Application Environment Variables ===
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_EXPIRES_IN"
    value     = var.jwt_expires_in
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_REFRESH_EXPIRES_IN"
    value     = var.jwt_refresh_expires_in
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_REFRESH_SECRET"
    value     = var.jwt_refresh_secret
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_SECRET"
    value     = var.jwt_secret
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "MONGODB_URI"
    value     = var.database_url
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "NODE_ENV"
    value     = var.env
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PORT"
    value     = tostring(var.port)
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ALLOWED_ORIGINS"
    value     = var.allowed_origins
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "FRONTEND_URL"
    value     = var.frontend_url
  }

  # === Process Settings (App listens on 8080) ===
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Port"
    value     = "8080"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Protocol"
    value     = "HTTP"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/api/v1"
  }

  # === CloudWatch Logs Configuration ===
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "DeleteOnTerminate"
    value     = "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = "7" # Or 14, 30, 60, etc.
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs:health"
    name      = "HealthStreamingEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs:health"
    name      = "DeleteOnTerminate"
    value     = "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs:health"
    name      = "RetentionInDays"
    value     = "7"
  }

  # === HTTPS Listener 443 → Instance 8080 ===
  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "ListenerEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "Protocol"
    value     = "HTTPS"
  }

  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "SSLCertificateArns"
    value     = "arn:aws:acm:us-east-1:211289421537:certificate/a7c99eca-1c33-4032-8be2-1ba28d4fa38e"
  }

  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "DefaultProcess"
    value     = "default"
  }

  # === HTTP Listener 80 → Instance 80 ===
  setting {
    namespace = "aws:elbv2:listener:80"
    name      = "ListenerEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elbv2:listener:80"
    name      = "Protocol"
    value     = "HTTP"
  }

  setting {
    namespace = "aws:elbv2:listener:80"
    name      = "DefaultProcess"
    value     = "default"
  }

  # === Process Settings for HTTP listener on 80 ===
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Port"
    value     = "80"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Protocol"
    value     = "HTTP"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/api/v1"
  }

  # ======================
  # Prevent accidental destroy
  # ======================
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Environment = var.env
    Project     = var.app_name
  }
}

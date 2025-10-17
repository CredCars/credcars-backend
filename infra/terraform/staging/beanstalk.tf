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
    value     = "1h"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_REFRESH_EXPIRES_IN"
    value     = "24h"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_REFRESH_SECRET"
    value     = "secret"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "JWT_SECRET"
    value     = "secret"
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
      value = tostring(var.port)
  }

  # =========================
# HTTPS Listener (443 → 8080)
# =========================
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
  value     = "arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERTIFICATE_ID"
}

setting {
  namespace = "aws:elbv2:listener:443"
  name      = "DefaultProcess"
  value     = "https"
}

# Environment process listens on port 8080 for HTTPS
setting {
  namespace = "aws:elasticbeanstalk:environment:process:https"
  name      = "Port"
  value     = "8080"
}

setting {
  namespace = "aws:elasticbeanstalk:environment:process:https"
  name      = "Protocol"
  value     = "HTTP"
}

setting {
  namespace = "aws:elasticbeanstalk:environment:process:https"
  name      = "HealthCheckPath"
  value     = "/api/v1"
}

setting {
  namespace = "aws:elasticbeanstalk:environment:process:https"
  name      = "HealthCheckProtocol"
  value     = "HTTP"
}

# =========================
# HTTP Listener (80 → 80)
# =========================
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
  value     = "http"
}

# Environment process listens on port 80 for HTTP
setting {
  namespace = "aws:elasticbeanstalk:environment:process:http"
  name      = "Port"
  value     = "80"
}

setting {
  namespace = "aws:elasticbeanstalk:environment:process:http"
  name      = "Protocol"
  value     = "HTTP"
}

setting {
  namespace = "aws:elasticbeanstalk:environment:process:http"
  name      = "HealthCheckPath"
  value     = "/api/v1"
}

setting {
  namespace = "aws:elasticbeanstalk:environment:process:http"
  name      = "HealthCheckProtocol"
  value     = "HTTP"
}
}


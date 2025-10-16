# ===========================================================
# Elastic Beanstalk EC2 Instance Profile (for EC2 instances)
# ===========================================================

resource "aws_iam_role" "eb_ec2_role" {
  name = "aws-elasticbeanstalk-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach standard AWS-managed policies for Elastic Beanstalk EC2 instances
resource "aws_iam_role_policy_attachment" "eb_ec2_webtier" {
  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
}

resource "aws_iam_role_policy_attachment" "eb_ec2_multicontainer" {
  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker"
}

resource "aws_iam_role_policy_attachment" "eb_ec2_workertier" {
  role       = aws_iam_role.eb_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier"
}

# Create the instance profile for EC2 instances
resource "aws_iam_instance_profile" "eb_ec2_instance_profile" {
  name = aws_iam_role.eb_ec2_role.name
  role = aws_iam_role.eb_ec2_role.name
}

# ===========================================================
# Elastic Beanstalk Service Role (for Beanstalk itself)
# ===========================================================

resource "aws_iam_role" "eb_service_role" {
  name = "aws-elasticbeanstalk-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "elasticbeanstalk.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eb_service_role_basic" {
  role       = aws_iam_role.eb_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService"

  depends_on = [aws_iam_role.eb_service_role]
}

resource "time_sleep" "wait_for_iam_propagation" {
  depends_on = [aws_iam_role_policy_attachment.eb_service_role_basic]
  create_duration = "30s"
}

resource "aws_iam_role_policy_attachment" "eb_service_role_health" {
  role       = aws_iam_role.eb_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"

  depends_on = [
    aws_iam_role.eb_service_role,
    time_sleep.wait_for_iam_propagation
  ]
}

# ===========================================================
# GitHub Actions Deployer User (Minimal EB permissions)
# ===========================================================

resource "aws_iam_user" "github_deployer" {
  name = "github-deployer"
}

resource "aws_iam_user_policy" "github_deployer_policy" {
  name = "github-deployer-eb-policy"
  user = aws_iam_user.github_deployer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "elasticbeanstalk:*",
          "cloudwatch:*",
          "s3:*",
          "autoscaling:*",
          "elasticloadbalancing:*",
          "cloudformation:*",
          "ec2:Describe*",
          "ec2:CreateTags",
          "ec2:DeleteTags"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "iam:PassRole"
        ],
        Resource = [
          aws_iam_role.eb_ec2_role.arn
        ]
      }
    ]
  })
}

# Attach access keys for GitHub Actions (store in Secrets)
resource "aws_iam_access_key" "github_deployer_key" {
  user = aws_iam_user.github_deployer.name
}

# Add this inline policy for S3 access
resource "aws_iam_role_policy" "eb_service_role_s3_access" {
  name = "eb-service-role-s3-access"
  role = aws_iam_role.eb_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::elasticbeanstalk-*",
          "arn:aws:s3:::elasticbeanstalk-*/*"
        ]
      }
    ]
  })
}

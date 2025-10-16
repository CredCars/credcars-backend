output "beanstalk_environment_url" {
  description = "Elastic Beanstalk environment URL"
  value       = aws_elastic_beanstalk_environment.env.endpoint_url
}
output "beanstalk_app_bucket" {
  description = "Elastic Beanstalk S3 bucket name for application versions"
  value       = aws_s3_bucket.beanstalk_app_bucket.bucket
}

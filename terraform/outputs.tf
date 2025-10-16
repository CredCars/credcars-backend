output "beanstalk_environment_url" {
  description = "Elastic Beanstalk environment URL"
  value       = aws_elastic_beanstalk_environment.env.endpoint_url
}

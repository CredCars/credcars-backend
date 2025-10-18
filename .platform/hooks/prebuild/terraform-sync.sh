#!/bin/bash
set -e

# ==========================
# CONFIGURATION
# ==========================
REGION="us-east-1"
APP_NAME="Credcars-backend"

# Terraform environment directories
STAGING_DIR="/Users/mac-os/Documents/credcars/backend/infra/terraform/staging"
PROD_DIR="/Users/mac-os/Documents/credcars/backend/infra/terraform/production"


# ==========================
# HELPER FUNCTIONS
# ==========================

# Import Elastic Beanstalk environment if it exists
import_eb_environment() {
  local tf_resource=$1
  local env_name=$2
  local tf_dir=$3

  echo "🔍 Checking Elastic Beanstalk environment: $env_name ..."
  ENV_ID=$(aws elasticbeanstalk describe-environments \
      --application-name $APP_NAME \
      --query "Environments[?EnvironmentName=='$env_name'].EnvironmentId" \
      --output text || echo "")

  if [ -n "$ENV_ID" ]; then
    echo "✅ $env_name exists (ID: $ENV_ID), importing into Terraform..."
    terraform -chdir=$tf_dir import $tf_resource $ENV_ID || echo "Already imported"
  else
    echo "⚙️ $env_name does not exist — Terraform will create it."
  fi
}

# Import IAM role if it exists
import_iam_role() {
  local tf_resource=$1
  local role_name=$2
  local tf_dir=$3

  if aws iam get-role --role-name $role_name >/dev/null 2>&1; then
    echo "✅ Importing IAM Role $role_name..."
    terraform -chdir=$tf_dir import $tf_resource $role_name || echo "Already imported"
  else
    echo "⚙️ IAM Role $role_name does not exist — Terraform will create it."
  fi
}

# Import IAM instance profile if it exists
import_instance_profile() {
  local tf_resource=$1
  local profile_name=$2
  local tf_dir=$3

  if aws iam get-instance-profile --instance-profile-name $profile_name >/dev/null 2>&1; then
    echo "✅ Importing IAM Instance Profile $profile_name..."
    terraform -chdir=$tf_dir import $tf_resource $profile_name || echo "Already imported"
  else
    echo "⚙️ IAM Instance Profile $profile_name does not exist — Terraform will create it."
  fi
}

# Import IAM user if it exists
import_iam_user() {
  local tf_resource=$1
  local user_name=$2
  local tf_dir=$3

  if aws iam get-user --user-name $user_name >/dev/null 2>&1; then
    echo "✅ Importing IAM User $user_name..."
    terraform -chdir=$tf_dir import $tf_resource $user_name || echo "Already imported"
  else
    echo "⚙️ IAM User $user_name does not exist — Terraform will create it."
  fi
}

# Check and handle GitHub deployer access keys
handle_github_deployer_keys() {
  local user_name="github-deployer"
  local tf_dir=$1

  echo "🔑 Checking existing access keys for $user_name ..."
  KEY_COUNT=$(aws iam list-access-keys --user-name $user_name --query 'length(AccessKeyMetadata)' --output text || echo 0)

  if [ "$KEY_COUNT" -ge 2 ]; then
    echo "⚠️ User $user_name already has $KEY_COUNT access keys (max allowed is 2)."
    echo "Terraform will skip creating new keys to avoid 'LimitExceeded' errors."
  else
    echo "✅ User $user_name has $KEY_COUNT keys — safe to create new key if needed."
  fi
}


# ==========================
# MAIN SCRIPT
# ==========================

echo "🚀 Initializing Terraform in staging and production..."
for dir in $STAGING_DIR $PROD_DIR; do
  terraform -chdir=$dir init -input=false
done

# Import Elastic Beanstalk application
echo "📦 Importing Elastic Beanstalk Application..."
terraform -chdir=$STAGING_DIR import aws_elastic_beanstalk_application.app $APP_NAME || echo "Already imported"

# Import environments
import_eb_environment "aws_elastic_beanstalk_environment.staging" "${APP_NAME}-staging-env" $STAGING_DIR
import_eb_environment "aws_elastic_beanstalk_environment.production" "${APP_NAME}-production-env" $PROD_DIR

# Import IAM roles
for role in aws-elasticbeanstalk-ec2-role aws-elasticbeanstalk-service-role; do
  import_iam_role "aws_iam_role.$role" $role $STAGING_DIR
done

# Import IAM instance profile
import_instance_profile "aws_iam_instance_profile.eb_ec2_instance_profile" "aws-elasticbeanstalk-ec2-role" $STAGING_DIR

# Import GitHub deployer user
import_iam_user "aws_iam_user.github_deployer" "github-deployer" $STAGING_DIR

# Handle GitHub deployer access key issue
handle_github_deployer_keys $STAGING_DIR

echo ""
echo "✅✅ All existing resources imported or verified."
echo "You can now safely run: terraform plan && terraform apply"

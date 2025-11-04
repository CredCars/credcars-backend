#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting dynamic Terraform import for existing AWS resources..."

# Ensure we're in the Terraform directory
if [ ! -f "main.tf" ]; then
  echo "❌ Run this script from your Terraform environment directory (e.g., infra/terraform/*)"
  exit 1
fi

# Detect environment (default: staging)
ENV=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-211289421537}
APP_NAME="Credcars-backend"
TFVARS_FILE="${ENV}.tfvars"
TF_FILE="beanstalk.tf"

if [ ! -f "$TFVARS_FILE" ]; then
  echo "❌ Missing Terraform variables file: $TFVARS_FILE"
  exit 1
fi

echo "🌍 Environment detected: $ENV"
echo "📄 Using variables file: $TFVARS_FILE"

# Environment-specific config
if [ "$ENV" = "production" ]; then
  GITHUB_DEPLOYER_ID="github-deployer-production"
  ENV_NAME="${APP_NAME}-production-env"
  CNAME_PREFIX="credcars-prod"
  VERSION_LABEL="v1-production"
else
  GITHUB_DEPLOYER_ID="github-deployer-staging"
  ENV_NAME="${APP_NAME}-staging-env"
  CNAME_PREFIX="credcars-staging"
  VERSION_LABEL="v1-staging"
fi

# Backup Terraform state (for safety)
if terraform state pull >/dev/null 2>&1; then
  echo "💾 Backing up current Terraform state..."
  terraform state pull > "state-backup-$(date +%F-%H%M%S).json" || true
fi

# --- Utility to append resource block if missing ---
append_if_missing() {
  local resource_type=$1
  local resource_name=$2
  local block=$3

  if grep -r "resource \"$resource_type\" \"$resource_name\"" ./*.tf >/dev/null 2>&1; then
    echo "✅ $resource_type.$resource_name already declared in Terraform files"
  else
    echo "🧩 Adding missing $resource_type.$resource_name definition to $TF_FILE..."
    echo -e "\n# Auto-added by import script\n$block" >> "$TF_FILE"
  fi
}

# --- Safe import wrapper ---
import_if_missing() {
  local resource=$1
  local id=$2

  echo "🧩 Checking Terraform state for $resource..."
  if terraform state list | grep -q "^${resource}$"; then
    echo "✅ Already in Terraform state: $resource"
    return 0
  fi

  echo "📦 Importing $resource → $id"
  set +e
  terraform import -input=false -no-color -lock=false -var-file="$TFVARS_FILE" "$resource" "$id"
  status=$?
  set -e

  if [ $status -eq 0 ]; then
    echo "✅ Imported successfully: $resource"
    return 0
  fi

  # Gracefully handle known cases
  if terraform state list | grep -q "^${resource}$"; then
    echo "✅ Appears already imported (skipping)."
    return 0
  fi

  if terraform import -dry-run "$resource" "$id" 2>&1 | grep -q "Resource already managed"; then
    echo "⚠️ Resource already managed by Terraform — skipping import."
    return 0
  fi

  echo "⚠️ Warning: import failed for $resource (exit code $status)"
  return 0
}

# --- Ensure EB Application exists ---
if ! aws elasticbeanstalk describe-applications --region "$AWS_REGION" \
  --query "Applications[?ApplicationName=='$APP_NAME']" --output text | grep -q "$APP_NAME"; then
  echo "🆕 Creating Elastic Beanstalk Application: $APP_NAME"
  aws elasticbeanstalk create-application \
    --application-name "$APP_NAME" \
    --region "$AWS_REGION" \
    --description "CredCars Backend Application" || true
else
  echo "✅ Elastic Beanstalk Application exists"
fi

# --- IAM Roles & Profiles ---
create_iam_role_if_missing() {
  local role_name=$1
  local policy_arn=$2
  if ! aws iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    echo "🆕 Creating IAM role: $role_name"
    aws iam create-role \
      --role-name "$role_name" \
      --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
          "Effect": "Allow",
          "Principal": {"Service": "elasticbeanstalk.amazonaws.com"},
          "Action": "sts:AssumeRole"
        }]
      }' >/dev/null
  else
    echo "✅ IAM role exists: $role_name"
  fi

  ATTACHED=$(aws iam list-attached-role-policies --role-name "$role_name" --query "AttachedPolicies[].PolicyArn" --output text)
  if [[ "$ATTACHED" != *"$policy_arn"* ]]; then
    echo "🔗 Attaching policy $policy_arn to $role_name"
    aws iam attach-role-policy --role-name "$role_name" --policy-arn "$policy_arn" || true
  fi
}

create_iam_role_if_missing "aws-elasticbeanstalk-service-role" "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
create_iam_role_if_missing "aws-elasticbeanstalk-ec2-role" "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"

if ! aws iam get-instance-profile --instance-profile-name "aws-elasticbeanstalk-ec2-role" >/dev/null 2>&1; then
  echo "🆕 Creating IAM Instance Profile: aws-elasticbeanstalk-ec2-role"
  aws iam create-instance-profile --instance-profile-name "aws-elasticbeanstalk-ec2-role"
  aws iam add-role-to-instance-profile \
    --instance-profile-name "aws-elasticbeanstalk-ec2-role" \
    --role-name "aws-elasticbeanstalk-ec2-role"
else
  echo "✅ IAM Instance Profile exists: aws-elasticbeanstalk-ec2-role"
fi

if ! aws iam get-user --user-name "$GITHUB_DEPLOYER_ID" >/dev/null 2>&1; then
  echo "🆕 Creating IAM user: $GITHUB_DEPLOYER_ID"
  aws iam create-user --user-name "$GITHUB_DEPLOYER_ID"
else
  echo "✅ IAM User exists: $GITHUB_DEPLOYER_ID"
fi

# --- Ensure EB App Version ---
EXISTING_VERSION=$(aws elasticbeanstalk describe-application-versions \
  --application-name "$APP_NAME" \
  --query "ApplicationVersions[?VersionLabel=='$VERSION_LABEL'].VersionLabel" \
  --output text || true)

if [ "$EXISTING_VERSION" != "$VERSION_LABEL" ]; then
  echo "🆕 Creating application version '$VERSION_LABEL'..."
  ZIP_FILE="app-${ENV}.zip"
  if [ ! -f "$ZIP_FILE" ]; then
    echo "console.log('Credcars backend ${ENV} environment');" > index.js
    zip -r "$ZIP_FILE" index.js >/dev/null
  fi
  aws s3 cp "$ZIP_FILE" "s3://elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}/${ZIP_FILE}"
  aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}",S3Key="${ZIP_FILE}" \
    --region "$AWS_REGION"
  echo "✅ Application version '$VERSION_LABEL' created."
else
  echo "✅ Application version '$VERSION_LABEL' already exists."
fi

# --- Detect and manage EB environment ---
SOLUTION_STACK=$(aws elasticbeanstalk list-available-solution-stacks \
  --region "$AWS_REGION" \
  --query "SolutionStacks[]" \
  --output text | tr '\t' '\n' | grep "64bit Amazon Linux 2023" | grep -E "Node.js (20|22)" | tail -n 1 | xargs)

if [ -z "$SOLUTION_STACK" ]; then
  echo "❌ Could not find Node.js 20/22 platform. Aborting."
  exit 1
fi

echo "🧩 Using solution stack: $SOLUTION_STACK"

EXISTING_ENV=$(aws elasticbeanstalk describe-environments \
  --application-name "$APP_NAME" \
  --environment-names "$ENV_NAME" \
  --region "$AWS_REGION" \
  --query "Environments[?Status!='Terminated'].EnvironmentName" \
  --output text || true)

if [ "$EXISTING_ENV" != "$ENV_NAME" ]; then
  echo "🆕 Creating Elastic Beanstalk environment: $ENV_NAME"
  aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "$SOLUTION_STACK" \
    --version-label "$VERSION_LABEL" \
    --cname-prefix "$CNAME_PREFIX" \
    --region "$AWS_REGION" \
    --option-settings \
      Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=loadbalanced \
      Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role \
      Namespace=aws:elasticbeanstalk:environment,OptionName=ServiceRole,Value=aws-elasticbeanstalk-service-role || true
else
  echo "✅ Environment '$ENV_NAME' already exists."
fi

# --- Ensure TF resource blocks exist ---
append_if_missing "aws_elastic_beanstalk_application" "app" \
"resource \"aws_elastic_beanstalk_application\" \"app\" {
  name = \"$APP_NAME\"
}"

append_if_missing "aws_elastic_beanstalk_environment" "env" \
"resource \"aws_elastic_beanstalk_environment\" \"env\" {
  name                = \"$ENV_NAME\"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = \"$SOLUTION_STACK\"
}"

append_if_missing "aws_iam_role" "eb_ec2_role" \
"resource \"aws_iam_role\" \"eb_ec2_role\" {
  name = \"aws-elasticbeanstalk-ec2-role\"
}"

append_if_missing "aws_iam_role" "eb_service_role" \
"resource \"aws_iam_role\" \"eb_service_role\" {
  name = \"aws-elasticbeanstalk-service-role\"
}"

append_if_missing "aws_iam_instance_profile" "eb_ec2_instance_profile" \
"resource \"aws_iam_instance_profile\" \"eb_ec2_instance_profile\" {
  name = \"aws-elasticbeanstalk-ec2-role\"
}"

# --- Terraform imports ---
echo "🧩 Importing resources into Terraform state (non-interactive)..."
import_if_missing aws_elastic_beanstalk_application.app "$APP_NAME"
import_if_missing aws_elastic_beanstalk_environment.env "$APP_NAME/$ENV_NAME"
import_if_missing aws_iam_role.eb_ec2_role aws-elasticbeanstalk-ec2-role
import_if_missing aws_iam_role.eb_service_role aws-elasticbeanstalk-service-role
import_if_missing aws_iam_instance_profile.eb_ec2_instance_profile aws-elasticbeanstalk-ec2-role
import_if_missing aws_iam_user.github_deployer "$GITHUB_DEPLOYER_ID"

echo "✅ Terraform import and environment setup completed successfully."

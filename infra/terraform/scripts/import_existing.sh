#!/usr/bin/env bash
set -euo pipefail

# ---------------------------
# import_existing.sh (improved)
# ---------------------------
echo "🚀 Starting dynamic Terraform import for existing AWS resources..."

# Ensure we're in the Terraform directory (main.tf presence)
if [ ! -f "main.tf" ]; then
  echo "❌ Run this script from your Terraform environment directory (e.g., infra/terraform/*)"
  exit 1
fi

# Ensure terraform init already run (helpful check)
if [ ! -d ".terraform" ]; then
  echo "⚠️ Warning: .terraform directory missing. Please run 'terraform init' before this script (CI usually does this)."
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

# Environment naming
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

# Helper to run terraform imports non-interactively
tf_import() {
  local addr=$1
  local id=$2
  echo "📦 terraform import $addr <- $id"
  terraform import -input=false -no-color -lock=false -var-file="$TFVARS_FILE" "$addr" "$id"
}

# --- robust detection of declared resource across all .tf files
resource_declared_in_tf() {
  local type="$1"
  local name="$2"
  # exact match search of resource "type" "name"
  if grep -R --line-number --binary-files=without-match -- "resource[[:space:]]*\"${type}\"[[:space:]]*\"${name}\"" ./*.tf >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

# Append minimal TF block to beanstalk.tf when missing (safe minimal stubs)
append_if_missing() {
  local rtype=$1
  local rname=$2
  local block=$3

  if resource_declared_in_tf "$rtype" "$rname"; then
    echo "✅ $rtype.$rname already declared in Terraform files"
  else
    echo "🧩 Adding missing $rtype.$rname declaration to $TF_FILE (minimal stub)..."
    printf "\n# Auto-added by import script - minimal stub\n%s\n" "$block" >> "$TF_FILE"
  fi
}

# ----- create/import helper (generic) -----
import_if_missing() {
  local addr=$1    # terraform address (e.g. aws_iam_role.eb_ec2_role)
  local id=$2      # remote id (string)
  if terraform state list | grep -q "^${addr}$"; then
    echo "✅ Already in state: $addr"
    return 0
  fi

  # skip import if the resource is declared in tf but state doesn't have it
  if resource_declared_in_tf "$(echo $addr | cut -d. -f1)" "$(echo $addr | cut -d. -f2)"; then
    echo "⚠️ ${addr} is declared in tf but not in state — attempting import (may fail if already managed elsewhere)."
  fi

  set +e
  tf_import "$addr" "$id"
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    echo "❌ Failed to import $addr <- $id (exit $rc)."
    return $rc
  fi
  echo "✅ Imported $addr successfully."
  return 0
}

# -----------------------
# Ensure application exists
# -----------------------
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

# -----------------------
# Ensure roles / instance-profile / user
# -----------------------
create_iam_role_if_missing() {
  local role_name=$1
  local policy_arn=$2
  if ! aws iam get-role --role-name "$role_name" >/dev/null 2>&1; then
    echo "🆕 Creating IAM role: $role_name"
    aws iam create-role \
      --role-name "$role_name" \
      --assume-role-policy-document '{
        "Version":"2012-10-17",
        "Statement":[{"Effect":"Allow","Principal":{"Service":"elasticbeanstalk.amazonaws.com"},"Action":"sts:AssumeRole"}]
      }' >/dev/null || true
  else
    echo "✅ IAM role exists: $role_name"
  fi

  ATTACHED=$(aws iam list-attached-role-policies --role-name "$role_name" --query "AttachedPolicies[].PolicyArn" --output text || true)
  if [[ "$ATTACHED" != *"$policy_arn"* ]]; then
    echo "🔗 Attaching policy $policy_arn to $role_name"
    aws iam attach-role-policy --role-name "$role_name" --policy-arn "$policy_arn" || true
  fi
}

create_iam_role_if_missing "aws-elasticbeanstalk-service-role" "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
create_iam_role_if_missing "aws-elasticbeanstalk-ec2-role" "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"

if ! aws iam get-instance-profile --instance-profile-name "aws-elasticbeanstalk-ec2-role" >/dev/null 2>&1; then
  echo "🆕 Creating IAM Instance Profile: aws-elasticbeanstalk-ec2-role"
  aws iam create-instance-profile --instance-profile-name "aws-elasticbeanstalk-ec2-role" || true
  aws iam add-role-to-instance-profile --instance-profile-name "aws-elasticbeanstalk-ec2-role" --role-name "aws-elasticbeanstalk-ec2-role" || true
else
  echo "✅ IAM Instance Profile exists: aws-elasticbeanstalk-ec2-role"
fi

if ! aws iam get-user --user-name "$GITHUB_DEPLOYER_ID" >/dev/null 2>&1; then
  echo "🆕 Creating IAM user: $GITHUB_DEPLOYER_ID"
  aws iam create-user --user-name "$GITHUB_DEPLOYER_ID" || true
else
  echo "✅ IAM User exists: $GITHUB_DEPLOYER_ID"
fi

# -----------------------
# Ensure application version exists (minimal)
# -----------------------
EXISTING_VERSION=$(aws elasticbeanstalk describe-application-versions \
  --application-name "$APP_NAME" \
  --query "ApplicationVersions[?VersionLabel=='$VERSION_LABEL'].VersionLabel" \
  --output text || true)

if [ "$EXISTING_VERSION" != "$VERSION_LABEL" ]; then
  echo "🆕 Creating application version '$VERSION_LABEL'..."
  ZIP_FILE="app-${ENV}.zip"
  if [ ! -f "$ZIP_FILE" ]; then
    echo "console.log('Credcars backend ${ENV} environment');" > index.js
    zip -r "$ZIP_FILE" index.js >/dev/null || true
  fi
  aws s3 cp "$ZIP_FILE" "s3://elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}/${ZIP_FILE}" || true
  aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="elasticbeanstalk-${AWS_REGION}-${AWS_ACCOUNT_ID}",S3Key="${ZIP_FILE}" \
    --region "$AWS_REGION" || true
  echo "✅ Application version '$VERSION_LABEL' created (or already exists)."
else
  echo "✅ Application version '$VERSION_LABEL' already exists."
fi

# -----------------------
# Platform / solution stack discovery
# -----------------------
SOLUTION_STACK=$(aws elasticbeanstalk list-available-solution-stacks \
  --region "$AWS_REGION" \
  --query "SolutionStacks[]" \
  --output text | tr '\t' '\n' | grep "64bit Amazon Linux 2023" | grep "Node.js" | tail -n 1 | xargs || true)

if [ -z "$SOLUTION_STACK" ]; then
  echo "❌ Could not find Node.js 22+ Amazon Linux 2023 solution stack. Aborting."
  exit 1
fi
echo "🧩 Using solution stack: $SOLUTION_STACK"

# -----------------------
# Create env if missing (minimal options) and import reliably
# -----------------------
EXISTING_ENV=$(aws elasticbeanstalk describe-environments \
  --application-name "$APP_NAME" \
  --environment-names "$ENV_NAME" \
  --region "$AWS_REGION" \
  --query "Environments[?Status!='Terminated'].EnvironmentName" \
  --output text || true)

if [ "$EXISTING_ENV" == "$ENV_NAME" ]; then
  echo "✅ Environment '$ENV_NAME' already exists."
else
  echo "🆕 Creating Elastic Beanstalk environment: $ENV_NAME (minimal option-settings to avoid LB mismatch)..."
  aws elasticbeanstalk create-environment \
    --application-name "$APP_NAME" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "$SOLUTION_STACK" \
    --version-label "$VERSION_LABEL" \
    --cname-prefix "$CNAME_PREFIX" \
    --region "$AWS_REGION" \
    --option-settings \
      Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role \
      Namespace=aws:elasticbeanstalk:environment,OptionName=ServiceRole,Value=aws-elasticbeanstalk-service-role \
    >/dev/null || true

  # poll for visibility (short)
  echo "⏳ Polling for new environment visibility..."
  POLL=0
  MAX_POLL=20
  while [ $POLL -lt $MAX_POLL ]; do
    sleep 6
    POLL=$((POLL+1))
    STATUS=$(aws elasticbeanstalk describe-environments \
      --application-name "$APP_NAME" \
      --environment-names "$ENV_NAME" \
      --region "$AWS_REGION" \
      --query "Environments[0].Status" \
      --output text 2>/dev/null || echo "None")
    if [ "$STATUS" != "None" ] && [ "$STATUS" != "null" ]; then
      echo "✅ Environment visible (status: $STATUS)"
      break
    fi
    echo "⏳ Not yet visible ($POLL/$MAX_POLL)..."
  done
fi

# fetch EnvironmentId if available (prefer id for import)
ENV_ID=$(aws elasticbeanstalk describe-environments \
  --application-name "$APP_NAME" \
  --environment-names "$ENV_NAME" \
  --region "$AWS_REGION" \
  --query "Environments[0].EnvironmentId" \
  --output text 2>/dev/null || true)

# add minimal stubs to tf only if missing (keeps beanstalk.tf untouched if present)
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

# ---------------
# Imports (use id when available)
# ---------------
echo "🧩 Importing resources into Terraform state (non-interactive)..."

# application
import_if_missing aws_elastic_beanstalk_application.app "$APP_NAME"

# environment (prefer id)
if [ -n "$ENV_ID" ] && [ "$ENV_ID" != "None" ]; then
  import_if_missing aws_elastic_beanstalk_environment.env "$ENV_ID"
else
  import_if_missing aws_elastic_beanstalk_environment.env "$APP_NAME/$ENV_NAME"
fi

# IAM roles / profile / user
import_if_missing aws_iam_role.eb_ec2_role aws-elasticbeanstalk-ec2-role || true
import_if_missing aws_iam_role.eb_service_role aws-elasticbeanstalk-service-role || true
import_if_missing aws_iam_instance_profile.eb_ec2_instance_profile aws-elasticbeanstalk-ec2-role || true
import_if_missing aws_iam_user.github_deployer "$GITHUB_DEPLOYER_ID" || true

echo "✅ Terraform import and environment setup completed successfully."

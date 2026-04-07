# ECS Fargate Deployment Guide — YetoPay

Step-by-step guide to deploy the Next.js app to AWS ECS Fargate with automated CI/CD.

**Target region:** `af-south-1` (Cape Town) — same region as the EFT service.

---

## Prerequisites

- AWS account with `af-south-1` region enabled (Cape Town is opt-in — enable it in AWS Console > Account > Regions)
- AWS CLI installed and configured (`aws configure`)
- Docker installed locally (for testing builds)
- GitHub repository with push access
- A domain name (e.g. `yetopay.co.za`) with DNS you can edit

---

## Step 1: Get Your AWS Account ID

```bash
aws sts get-caller-identity --query Account --output text
```

Save this — you'll replace `ACCOUNT_ID` everywhere below.

---

## Step 2: Create ECR Repository

This is where your Docker images are stored.

```bash
aws ecr create-repository \
  --repository-name yetopay \
  --region af-south-1 \
  --image-scanning-configuration scanOnPush=true
```

---

## Step 3: Create CloudWatch Log Group

ECS sends container logs here.

```bash
aws logs create-log-group \
  --log-group-name /ecs/yetopay-web \
  --region af-south-1
```

Optional — set retention to avoid cost creep:

```bash
aws logs put-retention-policy \
  --log-group-name /ecs/yetopay-web \
  --retention-in-days 30 \
  --region af-south-1
```

---

## Step 4: Store Secrets in Secrets Manager

Create a single secret with all your env vars. Copy values from your `.env.local`:

```bash
aws secretsmanager create-secret \
  --name yetopay/prod \
  --region af-south-1 \
  --secret-string '{
    "DATABASE_URL": "postgresql://user:pass@host/db?sslmode=require",
    "DIRECT_URL": "postgresql://user:pass@host/db?sslmode=require",
    "BETTER_AUTH_SECRET": "your-secret-here",
    "BETTER_AUTH_URL": "https://yourdomain.co.za",
    "NEXT_PUBLIC_APP_URL": "https://yourdomain.co.za",
    "NEXT_PUBLIC_EFT_SERVICE_URL": "http://10.x.x.x:3000/v1/eft",
    "PAYMENT_TOKEN_SECRET": "your-token-secret",
    "CREDENTIAL_ENCRYPTION_KEY": "your-encryption-key",
    "CREDENTIAL_ENCRYPTION_SALT": "your-encryption-salt",
    "EFT_WEBHOOK_SECRET": "your-webhook-secret",
    "SMTP_HOST": "smtp.resend.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "your-smtp-user",
    "SMTP_PASS": "your-smtp-pass",
    "SMTP_FROM": "noreply@yourdomain.co.za",
    "SMTP_FROM_NAME": "YetoPay"
  }'
```

> **Tip:** For `NEXT_PUBLIC_EFT_SERVICE_URL`, use the **private IP** of your EFT service EC2 instance if it's in the same VPC. This avoids public internet hops and CORS issues entirely.

To update later:

```bash
aws secretsmanager put-secret-value \
  --secret-id yetopay/prod \
  --region af-south-1 \
  --secret-string '{ ... updated values ... }'
```

---

## Step 5: Create IAM Roles

### 5a. ECS Task Execution Role

This role lets ECS pull images from ECR and read secrets.

```bash
# Create the role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach the default ECS execution policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Add Secrets Manager read access
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerRead \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:af-south-1:ACCOUNT_ID:secret:yetopay/prod*"
    }]
  }'
```

> Replace `ACCOUNT_ID` with your actual AWS account ID.

### 5b. ECS Task Role

This role is assumed by the running container (for any AWS SDK calls from your app).

```bash
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'
```

If your app doesn't call any AWS services directly, this role can stay empty.

---

## Step 6: Update task-definition.json

Open `aws/task-definition.json` and replace every `ACCOUNT_ID` with your real AWS account ID:

```bash
# Quick find & replace (Linux/Mac)
sed -i 's/ACCOUNT_ID/123456789012/g' aws/task-definition.json

# Windows PowerShell
(Get-Content aws/task-definition.json) -replace 'ACCOUNT_ID', '123456789012' | Set-Content aws/task-definition.json
```

Verify it looks correct:

```bash
cat aws/task-definition.json | grep "arn:aws"
```

---

## Step 7: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name yetopay-cluster \
  --region af-south-1 \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

---

## Step 8: Create VPC Networking (if not already set up)

If you already have a VPC with your EFT service, use that. Otherwise create one:

```bash
# Use default VPC
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region af-south-1)

# Get subnets (need at least 2 for ALB)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text --region af-south-1)

echo "VPC: $VPC_ID"
echo "Subnets: $SUBNETS"
```

### Create Security Groups

**ALB Security Group** (public-facing):

```bash
ALB_SG=$(aws ec2 create-security-group \
  --group-name yetopay-alb-sg \
  --description "ALB for YetoPay" \
  --vpc-id $VPC_ID \
  --region af-south-1 \
  --query "GroupId" --output text)

# Allow HTTP and HTTPS from anywhere
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region af-south-1
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0 --region af-south-1

echo "ALB SG: $ALB_SG"
```

**ECS Task Security Group** (only accepts traffic from ALB):

```bash
ECS_SG=$(aws ec2 create-security-group \
  --group-name yetopay-ecs-sg \
  --description "ECS tasks for YetoPay" \
  --vpc-id $VPC_ID \
  --region af-south-1 \
  --query "GroupId" --output text)

# Only allow traffic from ALB on port 3000
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG \
  --region af-south-1

echo "ECS SG: $ECS_SG"
```

> **Important:** If your EFT service is in the same VPC, also allow traffic from the ECS security group to the EFT service security group, so the app can reach the EFT service via private IP.

---

## Step 9: Create Application Load Balancer (ALB)

### 9a. Request SSL Certificate

```bash
aws acm request-certificate \
  --domain-name yourdomain.co.za \
  --subject-alternative-names "*.yourdomain.co.za" \
  --validation-method DNS \
  --region af-south-1
```

This outputs a certificate ARN. Add the DNS validation CNAME record to your domain, then wait for validation (usually 5-10 minutes).

Check status:

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:af-south-1:ACCOUNT_ID:certificate/CERT_ID \
  --query "Certificate.Status" \
  --region af-south-1
```

### 9b. Create Target Group

```bash
TG_ARN=$(aws elbv2 create-target-group \
  --name yetopay-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region af-south-1 \
  --query "TargetGroups[0].TargetGroupArn" --output text)

echo "Target Group: $TG_ARN"
```

### 9c. Create the ALB

```bash
# Use at least 2 subnets from different AZs
SUBNET_1=subnet-xxxxx  # Replace with your subnet IDs
SUBNET_2=subnet-yyyyy

ALB_ARN=$(aws elbv2 create-load-balancer \
  --name yetopay-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --region af-south-1 \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query "LoadBalancers[0].DNSName" --output text \
  --region af-south-1)

echo "ALB ARN: $ALB_ARN"
echo "ALB DNS: $ALB_DNS"
```

### 9d. Create HTTPS Listener

```bash
CERT_ARN="arn:aws:acm:af-south-1:ACCOUNT_ID:certificate/YOUR_CERT_ID"

aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region af-south-1
```

### 9e. Create HTTP to HTTPS Redirect

```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region af-south-1
```

---

## Step 10: Register Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://aws/task-definition.json \
  --region af-south-1
```

---

## Step 11: Create ECS Service

```bash
aws ecs create-service \
  --cluster yetopay-cluster \
  --service-name yetopay-web-service \
  --task-definition yetopay-web \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=yetopay-web,containerPort=3000" \
  --region af-south-1
```

> Set `assignPublicIp=ENABLED` if using public subnets (needed to pull images from ECR). If using private subnets, set up a NAT Gateway instead.

---

## Step 12: First Manual Deploy (Test)

Before setting up CI/CD, do one manual push to verify everything works:

```bash
# Login to ECR
aws ecr get-login-password --region af-south-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.af-south-1.amazonaws.com

# Build the image
docker build -t yetopay .

# Tag it
docker tag yetopay:latest ACCOUNT_ID.dkr.ecr.af-south-1.amazonaws.com/yetopay:latest

# Push it
docker push ACCOUNT_ID.dkr.ecr.af-south-1.amazonaws.com/yetopay:latest

# Force ECS to pull the new image
aws ecs update-service \
  --cluster yetopay-cluster \
  --service yetopay-web-service \
  --force-new-deployment \
  --region af-south-1
```

Watch the deployment:

```bash
aws ecs describe-services \
  --cluster yetopay-cluster \
  --services yetopay-web-service \
  --query "services[0].{status:status,running:runningCount,desired:desiredCount,deployments:deployments[*].{status:status,running:runningCount,desired:desiredCount}}" \
  --region af-south-1
```

Test the ALB:

```bash
curl -I https://ALB_DNS_NAME/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Step 13: Point DNS to ALB

In your DNS provider (Cloudflare, Route 53, etc.):

| Type | Name | Value |
|------|------|-------|
| CNAME | yourdomain.co.za | yetopay-alb-XXXXXXXX.af-south-1.elb.amazonaws.com |
| CNAME | www | yetopay-alb-XXXXXXXX.af-south-1.elb.amazonaws.com |

If using **Cloudflare**: set proxy status to "DNS only" (grey cloud) initially to test, then enable proxy (orange cloud) once confirmed working.

If using **Route 53**: use an Alias record pointing to the ALB instead of CNAME.

---

## Step 14: Set Up GitHub Actions CI/CD

### 14a. Create OIDC Identity Provider in AWS

This lets GitHub Actions authenticate without access keys:

```bash
# Create the OIDC provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 14b. Create GitHub Actions Role

```bash
aws iam create-role \
  --role-name GitHubActionsECSDeploy \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USER/yetopayeft:ref:refs/heads/main"
        }
      }
    }]
  }'

# Attach required policies
aws iam put-role-policy \
  --role-name GitHubActionsECSDeploy \
  --policy-name ECSDeploy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecr:GetAuthorizationToken"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ],
        "Resource": "arn:aws:ecr:af-south-1:ACCOUNT_ID:repository/yetopay"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:DescribeServices"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": "iam:PassRole",
        "Resource": [
          "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
          "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole"
        ]
      }
    ]
  }'
```

> Replace `YOUR_GITHUB_USER` with your GitHub username and `ACCOUNT_ID` with your AWS account ID.

### 14c. Add GitHub Repository Secret

Go to your GitHub repo > Settings > Secrets and variables > Actions > New repository secret:

| Secret Name | Value |
|-------------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsECSDeploy` |

Now every push to `main` will automatically build, push to ECR, and deploy to ECS.

---

## Step 15: Verify Everything

```bash
# Check ECS service is healthy
aws ecs describe-services \
  --cluster yetopay-cluster \
  --services yetopay-web-service \
  --query "services[0].{status:status,running:runningCount,health:healthCheckGracePeriodSeconds}" \
  --region af-south-1

# Check container logs
aws logs tail /ecs/yetopay-web --follow --region af-south-1

# Test your domain
curl -I https://yourdomain.co.za/api/health

# Test the full app
open https://yourdomain.co.za
```

---

## Useful Commands

### View logs

```bash
aws logs tail /ecs/yetopay-web --follow --region af-south-1
```

### Force redeploy (pull latest image)

```bash
aws ecs update-service \
  --cluster yetopay-cluster \
  --service yetopay-web-service \
  --force-new-deployment \
  --region af-south-1
```

### Scale up/down

```bash
aws ecs update-service \
  --cluster yetopay-cluster \
  --service yetopay-web-service \
  --desired-count 2 \
  --region af-south-1
```

### Update secrets

```bash
aws secretsmanager put-secret-value \
  --secret-id yetopay/prod \
  --region af-south-1 \
  --secret-string '{ ... }'

# Then force redeploy to pick up new secrets
aws ecs update-service \
  --cluster yetopay-cluster \
  --service yetopay-web-service \
  --force-new-deployment \
  --region af-south-1
```

### Stop the service (save cost)

```bash
aws ecs update-service \
  --cluster yetopay-cluster \
  --service yetopay-web-service \
  --desired-count 0 \
  --region af-south-1
```

### SSH into a running container (for debugging)

Enable ECS Exec first:

```bash
aws ecs update-service \
  --cluster yetopay-cluster \
  --service yetopay-web-service \
  --enable-execute-command \
  --region af-south-1

# Then exec into the task
TASK_ID=$(aws ecs list-tasks --cluster yetopay-cluster --service-name yetopay-web-service --query "taskArns[0]" --output text --region af-south-1)

aws ecs execute-command \
  --cluster yetopay-cluster \
  --task $TASK_ID \
  --container yetopay-web \
  --interactive \
  --command "/bin/sh" \
  --region af-south-1
```

---

## Cost Estimate (af-south-1)

| Resource | Monthly Cost |
|----------|-------------|
| ECS Fargate (0.5 vCPU, 1GB, 1 task 24/7) | ~$25 |
| ALB | ~$18 |
| ECR (image storage) | ~$1 |
| CloudWatch Logs (30 day retention) | ~$2 |
| ACM Certificate | Free |
| Secrets Manager (1 secret) | ~$0.40 |
| **Total** | **~$47/month** |

Scale to 2 tasks for high availability: add ~$25/month.

---

## Checklist

- [ ] AWS account with af-south-1 enabled
- [ ] ECR repository created
- [ ] CloudWatch log group created
- [ ] Secrets stored in Secrets Manager
- [ ] IAM roles created (execution + task)
- [ ] `ACCOUNT_ID` replaced in task-definition.json
- [ ] ECS cluster created
- [ ] Security groups created (ALB + ECS)
- [ ] ACM certificate requested and validated
- [ ] ALB created with target group and listeners
- [ ] Task definition registered
- [ ] ECS service created
- [ ] Manual deploy tested successfully
- [ ] DNS pointed to ALB
- [ ] OIDC provider created for GitHub Actions
- [ ] GitHub Actions role created
- [ ] `AWS_ROLE_ARN` secret added to GitHub repo
- [ ] CI/CD tested (push to main, verify deploy)

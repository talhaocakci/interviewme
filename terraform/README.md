# Terraform Infrastructure

This directory contains Terraform configurations for deploying AWS infrastructure for the Chat & Video Call application.

## What Gets Created

### Always Created:
- **S3 Bucket**: For storing recordings and uploaded files
  - Versioning enabled
  - Encryption at rest (AES256)
  - CORS configured
  - Lifecycle policies for cost optimization
- **IAM User**: With programmatic access for the application
- **IAM Policy**: Grants S3 access permissions
- **CloudWatch Log Group**: For application logs

### Optional (disabled by default):
- **RDS PostgreSQL**: Managed database instance
- **ElastiCache Redis**: For session management and caching
- **VPC & Security Groups**: For network isolation

## Prerequisites

1. **Install Terraform**:
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **AWS Credentials**:
   ```bash
   # Configure AWS CLI
   aws configure
   # Or set environment variables
   export AWS_ACCESS_KEY_ID="your-access-key"
   export AWS_SECRET_ACCESS_KEY="your-secret-key"
   export AWS_DEFAULT_REGION="us-east-1"
   ```

3. **Verify Installation**:
   ```bash
   terraform --version
   aws sts get-caller-identity
   ```

## Quick Start

### 1. Initialize Terraform

```bash
cd terraform
terraform init
```

This downloads required providers and initializes the backend.

### 2. Configure Variables

```bash
# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Minimum configuration (S3 only):**
```hcl
aws_region   = "us-east-1"
project_name = "chatvideo"
environment  = "dev"
```

### 3. Plan Infrastructure

```bash
terraform plan
```

Review the resources that will be created.

### 4. Apply Infrastructure

```bash
terraform apply
```

Type `yes` when prompted to confirm.

### 5. Get Outputs

```bash
# View all outputs
terraform output

# Get specific output
terraform output s3_bucket_name

# Get sensitive outputs (AWS credentials)
terraform output -json iam_access_key_id
terraform output -json iam_secret_access_key
```

### 6. Update Backend Configuration

After infrastructure is created, update your backend `.env`:

```bash
# Get the values
export S3_BUCKET=$(terraform output -raw s3_bucket_name)
export AWS_KEY=$(terraform output -raw iam_access_key_id)
export AWS_SECRET=$(terraform output -raw iam_secret_access_key)

# Update backend/.env
cd ../backend
cat >> .env << EOF
AWS_S3_BUCKET=$S3_BUCKET
AWS_ACCESS_KEY_ID=$AWS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET
AWS_REGION=us-east-1
EOF
```

## Configuration Options

### S3 Only (Minimum Setup)

```hcl
# terraform.tfvars
aws_region   = "us-east-1"
project_name = "chatvideo"
environment  = "dev"

cors_origins = [
  "http://localhost:19006",
  "https://yourdomain.com"
]
```

**Cost**: ~$1-5/month (depending on usage)

### With RDS PostgreSQL

```hcl
# terraform.tfvars
create_rds           = true
vpc_id               = "vpc-xxxxx"
db_subnet_ids        = ["subnet-xxxxx", "subnet-yyyyy"]
db_password          = "YourStrongPassword123!"
allowed_cidr_blocks  = ["10.0.0.0/16"]
```

**Cost**: ~$15-30/month (db.t3.micro)

### With Redis

```hcl
# terraform.tfvars
create_redis      = true
redis_subnet_ids  = ["subnet-xxxxx", "subnet-yyyyy"]
```

**Cost**: ~$15-20/month (cache.t3.micro)

## Environments

Create separate environments by using workspaces or different tfvars files:

```bash
# Development
terraform apply -var-file="dev.tfvars"

# Production
terraform apply -var-file="prod.tfvars"
```

Example `prod.tfvars`:
```hcl
environment             = "production"
db_instance_class       = "db.t3.small"
db_backup_retention_days = 30
recording_retention_days = 365
```

## Cost Estimation

Before applying, estimate costs:

```bash
# Using Terraform Cloud (recommended)
terraform login
terraform plan

# Or use infracost
infracost breakdown --path .
```

### Estimated Monthly Costs:

**S3 Only:**
- Storage: $0.023/GB
- Requests: ~$0.005 per 1000
- **Total: $1-5/month**

**With RDS (db.t3.micro):**
- Instance: ~$15/month
- Storage: $0.115/GB
- Backups: $0.095/GB
- **Total: $20-30/month**

**With Redis (cache.t3.micro):**
- Instance: ~$15/month
- **Total: $15-20/month**

**Full Stack: ~$40-60/month**

## Managing Infrastructure

### View Current State

```bash
terraform show
terraform state list
```

### Update Infrastructure

```bash
# Modify terraform.tfvars or *.tf files
terraform plan
terraform apply
```

### Destroy Infrastructure

```bash
# Destroy everything
terraform destroy

# Destroy specific resource
terraform destroy -target=aws_db_instance.main
```

⚠️ **Warning**: This will delete all data! Make backups first.

### Import Existing Resources

If you have existing AWS resources:

```bash
terraform import aws_s3_bucket.app_storage existing-bucket-name
```

## Security Best Practices

1. **Never commit sensitive files**:
   ```bash
   # Already in .gitignore
   terraform.tfvars
   *.tfstate
   *.tfstate.backup
   .terraform/
   ```

2. **Use strong passwords**:
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

3. **Enable encryption**:
   - S3 encryption: ✅ Enabled by default
   - RDS encryption: ✅ Enabled by default
   - Redis encryption: Configure if needed

4. **Restrict access**:
   - Use specific CIDR blocks
   - Don't use `0.0.0.0/0` in production

5. **Enable logging**:
   - CloudTrail: Track API calls
   - CloudWatch: Monitor resources
   - S3 access logs: Track file access

## State Management

### Local State (Default)

State is stored in `terraform.tfstate` file locally.

### Remote State (Recommended)

Store state in S3 with DynamoDB locking:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "your-terraform-state-bucket"
    key            = "chatvideo/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

## Troubleshooting

### Error: No VPC found

RDS/Redis require a VPC. Either:
1. Disable RDS/Redis: `create_rds = false`
2. Provide VPC ID: `vpc_id = "vpc-xxxxx"`

### Error: Bucket name already exists

S3 bucket names must be globally unique:
```hcl
project_name = "chatvideo-yourcompany"  # Make it unique
```

### Error: Access denied

Check AWS credentials:
```bash
aws sts get-caller-identity
aws iam get-user
```

### Error: Resource limit exceeded

AWS account limits may need to be increased. Contact AWS support.

## Integration with Application

After Terraform applies, configure your application:

```bash
# Get outputs
terraform output -json > outputs.json

# Update backend/.env automatically
python3 << 'EOF'
import json
with open('outputs.json') as f:
    outputs = json.load(f)
    
print(f"""
AWS_S3_BUCKET={outputs['s3_bucket_name']['value']}
AWS_ACCESS_KEY_ID={outputs['iam_access_key_id']['value']}
AWS_SECRET_ACCESS_KEY={outputs['iam_secret_access_key']['value']}
AWS_REGION={outputs['s3_bucket_region']['value']}
""")
EOF
```

## Additional Resources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

## Support

For issues:
1. Check Terraform logs: `TF_LOG=DEBUG terraform apply`
2. Review AWS Console for resource status
3. Check application logs in CloudWatch


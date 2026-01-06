# AWS S3 Setup Guide

This guide walks you through setting up AWS S3 for storing video recordings and media files.

## Step 1: Create S3 Bucket

1. **Log in to AWS Console**: https://console.aws.amazon.com
2. **Navigate to S3**: Services → S3
3. **Create Bucket**:
   - Click "Create bucket"
   - Bucket name: `your-app-recordings` (must be globally unique)
   - Region: Choose your preferred region (e.g., `us-east-1`)
   - Uncheck "Block all public access" (we'll configure specific permissions)
   - Click "Create bucket"

## Step 2: Configure CORS

CORS (Cross-Origin Resource Sharing) allows your frontend to upload files directly to S3.

1. Select your bucket
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Click "Edit" and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:19006",
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Note**: Update `AllowedOrigins` with your production domain.

## Step 3: Create IAM User

1. **Navigate to IAM**: Services → IAM
2. **Create User**:
   - Click "Users" → "Add users"
   - User name: `chat-app-s3-user`
   - Access type: "Access key - Programmatic access"
   - Click "Next: Permissions"

3. **Set Permissions**:
   - Click "Attach existing policies directly"
   - Search for "AmazonS3FullAccess" (or create custom policy below)
   - Click "Next: Tags" → "Next: Review" → "Create user"

4. **Save Credentials**:
   - **IMPORTANT**: Save the Access Key ID and Secret Access Key
   - You won't be able to see the Secret Access Key again!

### Custom IAM Policy (Recommended)

Instead of full S3 access, create a custom policy with minimal permissions:

1. In IAM, go to "Policies" → "Create policy"
2. Click "JSON" tab
3. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-app-recordings",
        "arn:aws:s3:::your-app-recordings/*"
      ]
    }
  ]
}
```

4. Name it `ChatAppS3Policy`
5. Attach this policy to your user

## Step 4: Configure Bucket Policy

This allows public read access to recordings (optional, based on your use case):

1. In your bucket, go to "Permissions" → "Bucket policy"
2. Click "Edit" and add:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-app-recordings/*"
    }
  ]
}
```

**Security Note**: This makes all files publicly readable. For private files, remove this policy and use presigned URLs only.

## Step 5: Enable Versioning (Optional)

Versioning keeps multiple versions of an object:

1. Go to "Properties" tab
2. Find "Bucket Versioning"
3. Click "Edit"
4. Enable versioning
5. Save

## Step 6: Configure Lifecycle Rules (Optional)

Automatically delete old recordings to save costs:

1. Go to "Management" tab
2. Click "Create lifecycle rule"
3. Rule name: `delete-old-recordings`
4. Rule scope: Apply to all objects
5. Lifecycle rule actions: Check "Expire current versions of objects"
6. Days after object creation: `90` (or your preference)
7. Create rule

## Step 7: Update Backend Configuration

Add to your `backend/.env`:

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-app-recordings
AWS_REGION=us-east-1
```

## Step 8: Test the Configuration

### Test Upload from Backend

```python
# test_s3.py
from backend.app.services.s3_service import s3_service

# Test upload
key = s3_service.generate_recording_key(user_id=1, call_id=1)
url = s3_service.generate_presigned_upload_url(key)
print(f"Upload URL: {url}")

# Test download
download_url = s3_service.generate_presigned_download_url(key)
print(f"Download URL: {download_url}")
```

### Test from Frontend

```typescript
// Test in your app
const { upload_url, file_key } = await apiService.getPresignedUploadUrl(
  'test.txt',
  'text/plain'
);
console.log('Upload URL:', upload_url);
```

## Security Best Practices

1. **Never commit credentials**: Keep AWS keys in `.env`, never in code
2. **Use presigned URLs**: Generate temporary URLs instead of public access
3. **Set expiration**: Presigned URLs should expire (1-24 hours)
4. **Encrypt at rest**: Enable S3 encryption (SSE-S3 or SSE-KMS)
5. **Enable logging**: Track access with S3 access logs
6. **Monitor costs**: Set up billing alerts
7. **Rotate keys**: Regularly rotate IAM access keys
8. **Use IAM roles**: For EC2/ECS, use IAM roles instead of access keys

## Enable Server-Side Encryption

1. Go to bucket "Properties"
2. Find "Default encryption"
3. Click "Edit"
4. Select "Enable"
5. Encryption type: "Amazon S3 managed keys (SSE-S3)"
6. Save

## Set Up CloudFront CDN (Optional)

For faster global access:

1. **Create CloudFront Distribution**:
   - Origin domain: Your S3 bucket
   - Origin access: Origin access control
   - Viewer protocol policy: Redirect HTTP to HTTPS

2. **Update Backend**:
   - Use CloudFront URL instead of S3 URL for downloads
   - Still upload directly to S3

## Monitoring and Alerts

### Set Up CloudWatch Alarms

1. Go to CloudWatch
2. Create alarms for:
   - S3 bucket size
   - Number of objects
   - Request metrics

### Enable S3 Access Logging

1. In bucket, go to "Properties"
2. Find "Server access logging"
3. Enable and choose target bucket for logs

## Cost Optimization

### S3 Storage Tiers

- **Standard**: For frequently accessed files
- **Standard-IA**: For infrequent access (> 30 days)
- **Glacier**: For long-term archival (> 90 days)

### Set Up Intelligent-Tiering

Automatically moves objects between tiers:

1. Go to bucket "Management"
2. Create lifecycle rule
3. Select "Transition current versions"
4. Choose "Intelligent-Tiering"

## Troubleshooting

### "Access Denied" Error

- Check IAM user has correct permissions
- Verify bucket policy
- Check CORS configuration
- Ensure presigned URL hasn't expired

### CORS Error

- Verify CORS configuration includes your domain
- Check AllowedMethods includes PUT/POST
- Ensure AllowedHeaders includes "*"

### Upload Fails

- Check file size (S3 limit: 5GB per PUT)
- Verify presigned URL is correct
- Check Content-Type header matches
- Ensure URL hasn't expired

### Cannot Access Files

- Check bucket policy for public access
- Verify presigned URL generation
- Check IAM permissions for GetObject

## Example File Structure

```
your-app-recordings/
├── uploads/
│   ├── user_1/
│   │   ├── image1.jpg
│   │   └── file.pdf
│   └── user_2/
│       └── image2.jpg
└── recordings/
    ├── user_1/
    │   ├── call_1/
    │   │   └── 20240101_120000.webm
    │   └── call_2/
    │       └── 20240101_130000.webm
    └── user_2/
        └── call_3/
            └── 20240101_140000.webm
```

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## Support

If you encounter issues:
1. Check CloudWatch logs
2. Review S3 access logs
3. Test with AWS CLI: `aws s3 ls s3://your-bucket`
4. Verify credentials: `aws sts get-caller-identity`


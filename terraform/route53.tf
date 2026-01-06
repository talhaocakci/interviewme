# Data source to get the existing Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = "contentpub.io"
  private_zone = false
}

# ACM Certificate for custom domain (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "web_app" {
  provider          = aws.us_east_1
  domain_name       = "calls.contentpub.io"
  validation_method = "DNS"

  tags = {
    Name        = "${var.project_name}-web-cert"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Route53 record for ACM certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.web_app.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# ACM certificate validation
resource "aws_acm_certificate_validation" "web_app" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.web_app.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 A record pointing to CloudFront (use alias, not CNAME)
resource "aws_route53_record" "web_app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "calls.contentpub.io"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web_app.domain_name
    zone_id                = aws_cloudfront_distribution.web_app.hosted_zone_id
    evaluate_target_health = false
  }
}


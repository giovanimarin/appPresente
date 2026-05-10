output "bucket_name" { value = aws_s3_bucket.uploads.id }
output "bucket_arn"  { value = aws_s3_bucket.uploads.arn }
output "iam_access_key_id" {
  value     = aws_iam_access_key.app.id
  sensitive = true
}
output "iam_secret_access_key" {
  value     = aws_iam_access_key.app.secret
  sensitive = true
}

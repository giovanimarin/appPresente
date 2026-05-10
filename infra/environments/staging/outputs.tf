output "app_public_ip"    { value = module.compute.public_ip }
output "db_endpoint"      { value = module.database.endpoint }
output "s3_bucket"        { value = module.storage.bucket_name }
output "s3_access_key"    { value = module.storage.iam_access_key_id; sensitive = true }
output "s3_secret_key"    { value = module.storage.iam_secret_access_key; sensitive = true }

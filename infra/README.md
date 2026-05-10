# Infraestrutura — Presente

Terraform + GitHub Actions para deploy na AWS `sa-east-1` (São Paulo).

## Visão geral

```
infra/
├── bootstrap/          # State bucket S3 + DynamoDB lock + ECR (rodar uma vez)
├── modules/
│   ├── networking/     # VPC, subnets, SGs
│   ├── database/       # RDS PostgreSQL
│   ├── cache/          # ElastiCache Redis (apenas produção)
│   ├── storage/        # S3 + IAM para uploads
│   └── compute/        # EC2 + EIP + IAM
└── environments/
    ├── staging/        # ~R$250/mês (sem ElastiCache, Redis no Docker)
    └── production/     # ~R$700/mês (ElastiCache, RDS t4g.small)
```

## Pré-requisitos

- Terraform >= 1.7
- AWS CLI configurado com permissões de Admin (`aws configure`)
- Acesso SSH: par de chaves EC2 criado na console AWS

---

## 1. Bootstrap (primeira vez apenas)

Cria o bucket de state remoto, tabela DynamoDB e repositório ECR.

```bash
cd infra/bootstrap
terraform init
terraform apply
```

Anote o nome do bucket gerado (ex: `presente-tfstate-<id>`).

---

## 2. Configurar variáveis

Crie o arquivo de variáveis para cada ambiente (**não commite este arquivo**):

```bash
# infra/environments/staging/terraform.tfvars
aws_region       = "sa-east-1"
environment      = "staging"
db_password      = "SENHA_FORTE_AQUI"
key_pair_name    = "presente-staging"
ec2_ami          = "ami-0c55b159cbfafe1f0"   # Amazon Linux 2023 em sa-east-1
```

```bash
# infra/environments/production/terraform.tfvars
aws_region       = "sa-east-1"
environment      = "production"
db_password      = "SENHA_FORTE_PROD"
key_pair_name    = "presente-production"
ec2_ami          = "ami-0c55b159cbfafe1f0"
```

---

## 3. Primeiro deploy de infraestrutura

```bash
cd infra/environments/staging
terraform init \
  -backend-config="bucket=presente-tfstate-<id>" \
  -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=sa-east-1" \
  -backend-config="dynamodb_table=presente-tfstate-lock"

terraform plan
terraform apply
```

Repita para `production/` quando estiver pronto.

---

## 4. Secrets no GitHub

Configure em **Settings → Secrets and variables → Actions**:

| Secret | Descrição |
|--------|-----------|
| `AWS_ACCESS_KEY_ID` | Chave de acesso AWS |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta AWS |
| `STAGING_HOST` | IP público da EC2 de staging |
| `STAGING_SSH_KEY` | Chave SSH privada (conteúdo do .pem) |
| `PRODUCTION_HOST` | IP público da EC2 de produção |
| `PRODUCTION_SSH_KEY` | Chave SSH privada de produção |
| `NEXTAUTH_SECRET` | Segredo para next-auth (staging) |
| `NEXTAUTH_SECRET_PROD` | Segredo para next-auth (produção) |
| `VERCEL_TOKEN` | Token da Vercel (deploy do frontend) |
| `VERCEL_ORG_ID` | ID da org na Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto na Vercel |
| `E2E_ADMIN_EMAIL` | Email do admin para testes E2E |
| `E2E_ADMIN_PASSWORD` | Senha do admin para testes E2E |
| `E2E_GUARDIAN_EMAIL` | Email do responsável para testes E2E |
| `E2E_GUARDIAN_PASSWORD` | Senha do responsável para testes E2E |

---

## 5. Fluxo de deploy

### Staging (automático)
Push para `main` → CI passa → deploy automático na EC2 de staging → Vercel preview.

### Produção (manual + tag)
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions abre um step de aprovação manual antes de fazer o deploy.

---

## 6. Acesso SSH às instâncias

```bash
# Staging
ssh -i ~/.ssh/presente-staging.pem ec2-user@<STAGING_HOST>

# Ver logs da API
sudo docker compose -f /opt/presente/docker-compose.prod.yml logs -f api

# Forçar redeploy manual
sudo /opt/presente/deploy.sh
```

---

## 7. Banco de dados

**Staging**: RDS `db.t4g.micro`, backup desabilitado, `deletion_protection = false`.  
**Produção**: RDS `db.t4g.small`, 7 dias de backup, `deletion_protection = true`.

Para conectar via SSM Session Manager (sem expor porta 5432):

```bash
aws ssm start-session \
  --target <instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["5433"]}'
```

Depois conecte em `localhost:5433` com seu cliente PostgreSQL.

---

## 8. Custos estimados (sa-east-1)

| Recurso | Staging | Produção |
|---------|---------|----------|
| EC2 t3.small | ~R$80 | ~R$80 |
| RDS t4g.micro/small | ~R$90 | ~R$180 |
| ElastiCache cache.t4g.micro | — | ~R$120 |
| S3 + transferência | ~R$10 | ~R$30 |
| EIP + outros | ~R$20 | ~R$20 |
| **Total** | **~R$200** | **~R$430** |

*Valores aproximados. Verifique o AWS Cost Explorer mensalmente.*

---

## 9. Destruir ambiente de staging

```bash
cd infra/environments/staging
terraform destroy
```

> **Nunca rode `terraform destroy` em produção sem aprovação do time.**

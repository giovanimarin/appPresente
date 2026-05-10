# Deploy em produção — Passo a passo completo

Tudo que já está no repositório (Terraform, Docker, GitHub Actions) funciona junto. Você só precisa executar cada etapa uma vez. Depois disso, deploy vira `git push`.

---

## Fase 1 — Contas e ferramentas (30 min)

### 1.1 O que você precisa ter

| O que | Onde criar | Custo |
|-------|-----------|-------|
| Conta AWS | aws.amazon.com | Grátis (paga pelo uso) |
| Conta Vercel | vercel.com | Grátis (hobby) ou $20/mês (pro) |
| Conta GitHub | já tem | Grátis |
| Domínio (ex: `usepresente.com.br`) | registro.br ou Cloudflare | ~R$50/ano |

### 1.2 Instale localmente

```bash
# macOS
brew install terraform awscli

# Windows (PowerShell como admin)
winget install HashiCorp.Terraform
winget install Amazon.AWSCLI
```

Verifique:
```bash
terraform --version   # >= 1.7
aws --version         # >= 2.x
```

---

## Fase 2 — AWS (45 min)

### 2.1 Crie um usuário IAM para o Terraform

1. Acesse **IAM → Users → Create user**
2. Nome: `presente-deploy`
3. Permissões: anexe a política `AdministratorAccess` (pode restringir depois)
4. Vá em **Security credentials → Create access key → CLI**
5. Copie `Access key ID` e `Secret access key`

Configure no terminal:
```bash
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: sa-east-1
# Default output format: json
```

### 2.2 Crie um par de chaves SSH para a EC2

No Console AWS → **EC2 → Key Pairs → Create key pair**:
- Nome: `presente-production`
- Tipo: RSA
- Formato: `.pem`
- Salve o arquivo `presente-production.pem` em `~/.ssh/`

```bash
chmod 400 ~/.ssh/presente-production.pem
```

Repita com nome `presente-staging` para o ambiente de staging.

---

## Fase 3 — Bootstrap da infraestrutura (20 min)

Isso cria o bucket S3 que guardará o estado do Terraform e o repositório de imagens Docker (ECR). **Rode uma única vez.**

```bash
cd infra/bootstrap
terraform init
terraform apply
```

Anote o output — ele vai mostrar algo como:
```
ecr_repository_url = "123456789.dkr.ecr.sa-east-1.amazonaws.com/presente/api"
state_bucket       = "presente-tfstate-abc123"
```

---

## Fase 4 — Configurar variáveis dos ambientes (10 min)

Crie os arquivos de variáveis **localmente** (eles estão no `.gitignore` — nunca vão para o git):

**`infra/environments/staging/terraform.tfvars`**
```hcl
aws_region    = "sa-east-1"
environment   = "staging"
db_password   = "escolha-uma-senha-forte-aqui"
key_pair_name = "presente-staging"
ec2_ami       = "ami-0af6e9042ea5a4e3e"  # Amazon Linux 2023, sa-east-1
```

**`infra/environments/production/terraform.tfvars`**
```hcl
aws_region    = "sa-east-1"
environment   = "production"
db_password   = "senha-diferente-e-ainda-mais-forte"
key_pair_name = "presente-production"
ec2_ami       = "ami-0af6e9042ea5a4e3e"
```

> **Dica de AMI**: para pegar a AMI mais recente do Amazon Linux 2023 em sa-east-1 rode:
> `aws ec2 describe-images --owners amazon --filters "Name=name,Values=al2023-ami-*-x86_64" --query 'sort_by(Images,&CreationDate)[-1].ImageId' --region sa-east-1`

---

## Fase 5 — Criar a infraestrutura de staging (15 min)

```bash
cd infra/environments/staging

terraform init \
  -backend-config="bucket=presente-tfstate-abc123" \
  -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=sa-east-1" \
  -backend-config="dynamodb_table=presente-tfstate-lock"

terraform plan    # revise o que será criado
terraform apply   # confirme com "yes"
```

No final, anote o IP público da EC2:
```
ec2_public_ip = "54.232.xxx.xxx"
```

Repita para `production/` quando quiser subir produção.

---

## Fase 6 — Vercel (frontend) (15 min)

1. Acesse vercel.com → **Add New Project → Import Git Repository**
2. Selecione o repositório do Presente
3. Configure:
   - **Root Directory**: `apps/web`
   - **Framework**: Next.js (detecta automático)
   - **Environment Variables**:
     ```
     NEXT_PUBLIC_API_URL = https://api.seudominio.com.br/api/v1
     NEXTAUTH_SECRET     = (gere com: openssl rand -base64 32)
     NEXTAUTH_URL        = https://app.seudominio.com.br
     ```
4. Clique em **Deploy**
5. Em **Settings → General**, anote o **Project ID** e **Org ID**
6. Em **Settings → Tokens**, crie um token com nome `github-actions`

---

## Fase 7 — Secrets no GitHub (20 min)

Acesse o repositório no GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Da etapa 2.1 |
| `AWS_SECRET_ACCESS_KEY` | Da etapa 2.1 |
| `STAGING_HOST` | IP da EC2 de staging |
| `STAGING_SSH_KEY` | Conteúdo do arquivo `presente-staging.pem` |
| `PRODUCTION_HOST` | IP da EC2 de produção |
| `PRODUCTION_SSH_KEY` | Conteúdo do arquivo `presente-production.pem` |
| `NEXTAUTH_SECRET` | Segredo gerado para staging |
| `NEXTAUTH_SECRET_PROD` | Segredo gerado para produção |
| `VERCEL_TOKEN` | Token criado na Vercel |
| `VERCEL_ORG_ID` | ID da org na Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto na Vercel |
| `E2E_ADMIN_EMAIL` | Email de um admin no banco de staging |
| `E2E_ADMIN_PASSWORD` | Senha do admin |
| `E2E_GUARDIAN_EMAIL` | Email de um responsável no banco de staging |
| `E2E_GUARDIAN_PASSWORD` | Senha do responsável |

Para copiar o conteúdo do `.pem` no terminal:
```bash
cat ~/.ssh/presente-staging.pem | pbcopy   # macOS
cat ~/.ssh/presente-staging.pem            # Windows: copie o output manualmente
```

---

## Fase 8 — DNS e HTTPS (20 min)

No seu registrador de domínio (registro.br ou Cloudflare), crie os registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `api` | IP público da EC2 de produção |
| A | `api-staging` | IP público da EC2 de staging |
| CNAME | `app` | URL gerada pela Vercel (ex: `presente.vercel.app`) |

O HTTPS da API é gerenciado pelo Certbot que já está no `docker-compose.prod.yml`. Na primeira subida, ele obterá o certificado automaticamente.

---

## Fase 9 — Primeiro deploy manual (para validar tudo)

Com a infraestrutura criada, faça o primeiro build e push da imagem Docker manualmente:

```bash
# Autentica no ECR
aws ecr get-login-password --region sa-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.sa-east-1.amazonaws.com

# Build e push
docker build -t presente/api apps/api/
docker tag presente/api:latest \
  123456789.dkr.ecr.sa-east-1.amazonaws.com/presente/api:latest
docker push 123456789.dkr.ecr.sa-east-1.amazonaws.com/presente/api:latest
```

Acesse a EC2 e rode o deploy inicial:
```bash
ssh -i ~/.ssh/presente-production.pem ec2-user@<IP>
sudo /opt/presente/deploy.sh
```

Verifique:
```bash
curl https://api.seudominio.com.br/health
# {"status":"ok"}
```

---

## Fase 10 — A esteira automatizada (como funciona daqui pra frente)

A partir de agora, o fluxo é completamente automático:

```
Você escreve código
       │
       ▼
  git push origin feature/xyz
       │
       ▼
  Abre Pull Request
       │
       ▼
  ┌─────────────────────────────┐
  │  CI roda automaticamente:   │
  │  ✓ Lint + Typecheck         │
  │  ✓ Testes unitários         │
  │  ✓ Testes de integração     │
  │  ✓ Build completo           │
  │  ✓ Testes E2E (Playwright)  │
  └─────────────────────────────┘
       │ tudo verde
       ▼
  Merge para main
       │
       ▼
  ┌─────────────────────────┐
  │  Deploy STAGING auto:   │
  │  → Build imagem Docker  │
  │  → Push ECR             │
  │  → SSH → deploy.sh      │
  │  → Smoke test           │
  │  → Deploy Vercel        │
  └─────────────────────────┘
       │ validou em staging
       ▼
  git tag v1.2.0 && git push --tags
       │
       ▼
  ┌─────────────────────────────────┐
  │  Deploy PRODUÇÃO:               │
  │  → Pede aprovação manual        │
  │  → (você clica em "Approve")    │
  │  → Build imagem com tag v1.2.0  │
  │  → Push ECR                     │
  │  → SSH → deploy.sh              │
  │  → Smoke test                   │
  │  → Deploy Vercel produção       │
  │  → Cria GitHub Release          │
  └─────────────────────────────────┘
```

### Deploy de uma nova feature — resumo do que você faz:

```bash
git checkout -b feature/nova-funcionalidade
# ... escreve código ...
git push origin feature/nova-funcionalidade
# Abre PR no GitHub, CI roda
# PR aprovado, faz merge
# Aguarda deploy automático em staging
# Valida em staging
git tag v1.3.0
git push origin v1.3.0
# Aprova o deploy no GitHub Actions
# Produção atualizada em ~5 min
```

---

## Checklist de primeiro deploy

- [ ] Conta AWS criada e usuário IAM configurado
- [ ] Par de chaves SSH criado (`presente-staging` e `presente-production`)
- [ ] `terraform apply` rodado em `bootstrap/`
- [ ] `terraform.tfvars` criado para staging e production
- [ ] `terraform apply` rodado em `environments/staging/`
- [ ] `terraform apply` rodado em `environments/production/`
- [ ] Projeto criado na Vercel com as env vars corretas
- [ ] Todos os 14 secrets configurados no GitHub
- [ ] Registros DNS apontando para os IPs da EC2
- [ ] Primeiro deploy manual validado (`/health` retorna 200)
- [ ] Push para `main` → CI passou → staging atualizado
- [ ] Tag `v1.0.0` criada → produção atualizada com aprovação

# Presente — Setup de Desenvolvimento

## Pré-requisitos
- Node.js 20+
- Docker + Docker Compose

## 1. Configurar variáveis de ambiente

```bash
cp .env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Edite `apps/api/.env` com seus valores (ou mantenha os padrões para dev local).

## 2. Subir infraestrutura

```bash
docker-compose up -d
```

Isso sobe:
- PostgreSQL 15 em `localhost:5432`
- Redis 7 em `localhost:6379`
- MinIO (S3 local) em `localhost:9000` (console em `localhost:9001`)

## 3. Instalar dependências

```bash
npm install
```

## 4. Gerar cliente Prisma + rodar migrações + seed

```bash
# Primeiro pare o servidor se estiver rodando (para liberar o DLL do Prisma)
npm run db:migrate          # roda prisma migrate dev
npm run db:seed             # seed com escola Girassol
```

> Se o `prisma generate` falhar com EPERM, pare todos os processos Node e tente novamente.

## 5. Iniciar em desenvolvimento

```bash
# API (porta 3001) + Web (porta 3000) juntos:
npm run dev

# Ou separadamente:
npm run dev --workspace=apps/api
npm run dev --workspace=apps/web

# Workers BullMQ (em terminal separado):
npm run workers
```

## Credenciais de teste (seed)

| Role              | Email                        | Senha           | URL                     |
|-------------------|------------------------------|-----------------|-------------------------|
| Dono do SaaS      | admin@presente.com.br        | Platform@2026   | /platform/login         |
| Admin escola      | admin@girassol.com.br        | Presente@2026   | /login                  |
| Secretária        | secretaria@girassol.com.br   | Presente@2026   | /login                  |
| Professor         | prof.ana@girassol.com.br     | Presente@2026   | /login                  |

**Responsável (OTP via SMS):** `+5511900000001`

## URLs

| Serviço   | URL                          |
|-----------|------------------------------|
| API       | http://localhost:3001        |
| API Docs  | http://localhost:3001/health |
| Web       | http://localhost:3000        |
| MinIO     | http://localhost:9001        |

## Rotas implementadas

### Auth — `/api/v1/auth`
- `POST /staff/login` — login com email/senha
- `POST /guardian/request-otp` — solicitar OTP por SMS
- `POST /guardian/verify-otp` — verificar OTP e retornar JWT
- `POST /refresh` — renovar access token
- `GET /me` — perfil do usuário logado
- `POST /logout` — revogar refresh token

### Escolas — `/api/v1/schools`
- `GET /me`, `PUT /me`, `GET /me/stats`

### Usuários — `/api/v1/users`
- CRUD completo + filtros por role

### Turmas/Alunos — `/api/v1/classes`, `/api/v1/students`
- CRUD de turmas, alunos, vínculos professor-turma

### Responsáveis — `/api/v1/guardians`
- Ativação, perfil, convites, aprovação de vínculos

### Comunicados — `/api/v1/communications`
- CRUD, envio, cancelamento, relatório de leitura
- Feed do responsável, confirmação de leitura (imutável)
- Comunicado do responsável + resolução pela escola

### Agenda — `/api/v1/agenda`
- CRUD de eventos com tipos, recorrência, turmas
- Cancelamento com notificação automática
- Feed do responsável (próximos 30 dias)

### Formulários — `/api/v1/forms`
- CRUD de templates, submissões com protocolo
- Feed e submissão pelo responsável
- Resolução pela escola

### Uploads — `/api/v1/uploads`
- URL pré-assinada para upload direto no S3/MinIO
- Confirmação e download com URL temporária

### Dashboard — `/api/v1/dashboard`
- Stats gerais, relatório de comunicados, engajamento por responsável

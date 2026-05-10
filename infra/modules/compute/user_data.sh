#!/bin/bash
set -e

# Instala Docker
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release awscli
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Habilita Docker no boot
systemctl enable docker
systemctl start docker

# Adiciona ubuntu ao grupo docker
usermod -aG docker ubuntu

# Cria diretório da aplicação
mkdir -p /opt/presente
chown ubuntu:ubuntu /opt/presente

# Script de deploy (usado pelo GitHub Actions via SSH)
cat > /opt/presente/deploy.sh << 'DEPLOY'
#!/bin/bash
set -e

ECR_REGISTRY="${ecr_registry}"
AWS_REGION="${aws_region}"
IMAGE_TAG="$1"
ENV="${env}"

echo "[deploy] Autenticando no ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "[deploy] Baixando imagem $IMAGE_TAG..."
docker pull "$ECR_REGISTRY/presente/api:$IMAGE_TAG"

echo "[deploy] Atualizando serviço..."
cd /opt/presente
API_IMAGE="$ECR_REGISTRY/presente/api:$IMAGE_TAG" docker compose -f docker-compose.yml up -d api

echo "[deploy] Concluído! (migrações rodam no entrypoint do container)"
DEPLOY

chmod +x /opt/presente/deploy.sh
chown ubuntu:ubuntu /opt/presente/deploy.sh

# Docker Compose — gerado no boot, API_IMAGE é sobrescrito no deploy
cat > /opt/presente/docker-compose.yml << 'COMPOSE'
services:
  api:
    image: $${API_IMAGE:-presente/api:latest}
    container_name: presente-api
    restart: unless-stopped
    env_file: .env
    ports:
      - "3001:3001"
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: presente-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
COMPOSE

chown ubuntu:ubuntu /opt/presente/docker-compose.yml

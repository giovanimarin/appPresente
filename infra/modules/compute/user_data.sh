#!/bin/bash
set -e

# Instala Docker e nginx
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release awscli nginx
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Habilita Docker e nginx no boot
systemctl enable docker nginx
systemctl start docker

# Adiciona ubuntu ao grupo docker
usermod -aG docker ubuntu

# Configura nginx como proxy reverso para a API
cat > /etc/nginx/sites-available/presente << 'NGINX'
server {
    listen 80;
    server_name _;

    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        client_max_body_size 20M;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/presente /etc/nginx/sites-enabled/presente
rm -f /etc/nginx/sites-enabled/default
systemctl start nginx

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

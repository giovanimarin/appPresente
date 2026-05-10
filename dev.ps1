#Requires -Version 5.1
<#
.SYNOPSIS
    Presente - Script de desenvolvimento para Windows/PowerShell

.DESCRIPTION
    Sobe infraestrutura Docker, roda migracoes e inicia os servidores.

.PARAMETER Seed
    Popula o banco com dados de teste apos migrar.

.PARAMETER Reset
    Recria o banco do zero (migrate reset + seed automatico).

.EXAMPLE
    .\dev.ps1              # primeira vez
    .\dev.ps1 -Seed        # com dados de teste
    .\dev.ps1 -Reset       # limpa tudo e recomeca
#>
param(
    [switch]$Seed,
    [switch]$Reset
)

$ErrorActionPreference = "Stop"
if ($Reset) { $Seed = $true }

$Root   = $PSScriptRoot
$ApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web"

# -- Helpers ------------------------------------------------------------------
function Log  ($msg) { Write-Host "[presente] $msg" -ForegroundColor Green }
function Warn ($msg) { Write-Host "[presente] $msg" -ForegroundColor Yellow }
function Fail ($msg) { Write-Host "[presente] $msg" -ForegroundColor Red; exit 1 }

# -- 1. Verificar dependencias ------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail "Docker nao encontrado. Instale em https://docker.com" }
if (-not (Get-Command node   -ErrorAction SilentlyContinue)) { Fail "Node.js nao encontrado. Instale em https://nodejs.org" }
if (-not (Get-Command npm    -ErrorAction SilentlyContinue)) { Fail "npm nao encontrado." }

# -- 2. Criar .env se nao existir ---------------------------------------------
$EnvFile = Join-Path $ApiDir ".env"
if (-not (Test-Path $EnvFile)) {
    Warn ".env nao encontrado - copiando .env.example"
    Copy-Item (Join-Path $Root ".env.example") $EnvFile
    Log ".env criado em apps/api/.env"
}

$WebEnv = Join-Path $WebDir ".env.local"
if (-not (Test-Path $WebEnv)) {
    $WebEnvExample = Join-Path $WebDir ".env.local.example"
    if (Test-Path $WebEnvExample) { Copy-Item $WebEnvExample $WebEnv }
}

# -- 3. Docker Compose --------------------------------------------------------
Log "Subindo PostgreSQL, Redis e MinIO..."
docker compose -f "$Root\docker-compose.yml" up -d --remove-orphans
if ($LASTEXITCODE -ne 0) { Fail "Falha ao subir Docker Compose" }

# -- 4. Aguardar servicos -----------------------------------------------------
function Wait-Healthy($service) {
    Log "Aguardando $service ficar saudavel..."
    for ($i = 0; $i -lt 30; $i++) {
        $status = docker inspect --format="{{.State.Health.Status}}" "presente_$service" 2>$null
        if ($status -eq "healthy") { Log "$service pronto."; return }
        Start-Sleep -Seconds 2
    }
    Fail "$service nao ficou saudavel em 60s. Verifique: docker logs presente_$service"
}

Wait-Healthy "postgres"
Wait-Healthy "redis"
Wait-Healthy "minio"

# -- 5. Instalar dependencias -------------------------------------------------
Log "Instalando dependencias npm..."
Push-Location $Root
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "npm install falhou" }
Pop-Location

# -- 6. Matar processos Node travados (fix lock do Prisma no Windows) ---------
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Warn "Encerrando processos Node existentes para liberar o Prisma..."
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# -- 7. Prisma generate -------------------------------------------------------
Log "Gerando cliente Prisma..."
Push-Location $ApiDir
npx prisma generate
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "prisma generate falhou" }
Pop-Location

# -- 8. Migracoes -------------------------------------------------------------
Push-Location $ApiDir
if ($Reset) {
    Warn "Resetando banco de dados (--reset)..."
    npx prisma migrate reset --force
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "prisma migrate reset falhou" }
} else {
    Log "Rodando migracoes..."
    $migOut = npx prisma migrate dev --name "update" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Warn "migrate dev falhou, tentando migrate deploy..."
        npx prisma migrate deploy
        if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Falha nas migracoes. Tente .\dev.ps1 -Reset" }
    }
    Write-Host $migOut
}
Pop-Location

# -- 9. Seed ------------------------------------------------------------------
if ($Seed) {
    Log "Populando banco com dados de teste..."
    Push-Location $ApiDir
    npx ts-node -r tsconfig-paths/register prisma/seed.ts
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "seed falhou" }
    Pop-Location
}

# -- 10. Descobrir IP da rede local -------------------------------------------
$LocalIP = "?"
try {
    $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
    if (-not $LocalIP) {
        $LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "172.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
    }
} catch {}

# -- Iniciar servidores em janelas separadas ----------------------------------
Write-Host ""
Write-Host "  +----------------------------------------------------+" -ForegroundColor DarkCyan
Write-Host "  |              Presente rodando!                     |" -ForegroundColor DarkCyan
Write-Host "  |                                                    |" -ForegroundColor DarkCyan
Write-Host "  |  Web local:   http://localhost:3000                |" -ForegroundColor DarkCyan
Write-Host ("  |  Web rede:    http://" + $LocalIP + ":3000              |") -ForegroundColor DarkCyan
Write-Host "  |  API:         http://localhost:3001                |" -ForegroundColor DarkCyan
Write-Host "  |  MinIO:       http://localhost:9001                |" -ForegroundColor DarkCyan
Write-Host "  |                                                    |" -ForegroundColor DarkCyan
Write-Host "  |  Plataforma:  admin@presente.com.br                |" -ForegroundColor DarkCyan
Write-Host "  |               Platform@2026                        |" -ForegroundColor DarkCyan
Write-Host "  +----------------------------------------------------+" -ForegroundColor DarkCyan
Write-Host ""

Log "Abrindo API e Web em janelas separadas..."

$apiCmd = "Set-Location " + $ApiDir + "; npm run dev"
$apiProcess = Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $apiCmd -PassThru

Start-Sleep -Seconds 2

$webCmd = "Set-Location " + $WebDir + "; npm run dev"
$webProcess = Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $webCmd -PassThru

Write-Host ""
Log "Dois terminais abertos. Para encerrar ambos, pressione Enter aqui."
Read-Host | Out-Null

Log "Encerrando servidores..."
if ($apiProcess -and -not $apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue }
if ($webProcess -and -not $webProcess.HasExited) { Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue }
Log "Pronto."

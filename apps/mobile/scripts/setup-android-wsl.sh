#!/usr/bin/env bash
# Setup do ambiente Android para builds locais no WSL (Ubuntu/Debian)
# Uso: bash apps/mobile/scripts/setup-android-wsl.sh
set -e

ANDROID_SDK_ROOT="$HOME/android-sdk"
CMDLINE_TOOLS_VERSION="11076708"  # commandlinetools-linux-11076708_latest.zip
JAVA_VERSION="17"

echo "=== Presente — Setup Android SDK para builds locais ==="
echo ""

# ── 1. JDK ─────────────────────────────────────────────────────────────────
if java -version 2>&1 | grep -q "17\|21"; then
  echo "[ok] JDK já instalado: $(java -version 2>&1 | head -1)"
else
  echo "[...] Instalando JDK $JAVA_VERSION..."
  sudo apt-get update -qq
  sudo apt-get install -y openjdk-${JAVA_VERSION}-jdk
  echo "[ok] JDK $JAVA_VERSION instalado."
fi

# ── 2. Dependências do build ────────────────────────────────────────────────
echo "[...] Instalando dependências do sistema..."
sudo apt-get install -y unzip wget curl git 2>/dev/null || true
echo "[ok] Dependências OK."

# ── 3. Android SDK command-line tools ──────────────────────────────────────
CMDLINE_TOOLS_DIR="$ANDROID_SDK_ROOT/cmdline-tools/latest"
if [ -d "$CMDLINE_TOOLS_DIR" ]; then
  echo "[ok] Android command-line tools já instalados em $CMDLINE_TOOLS_DIR"
else
  echo "[...] Baixando Android command-line tools (~150 MB)..."
  mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
  TMP_ZIP="/tmp/cmdline-tools.zip"
  wget -q --show-progress \
    "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip" \
    -O "$TMP_ZIP"
  echo "[...] Extraindo..."
  unzip -q "$TMP_ZIP" -d "$ANDROID_SDK_ROOT/cmdline-tools/"
  mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$CMDLINE_TOOLS_DIR"
  rm "$TMP_ZIP"
  echo "[ok] Command-line tools extraídos."
fi

# ── 4. Variáveis de ambiente ────────────────────────────────────────────────
PROFILE_FILE="$HOME/.bashrc"
if ! grep -q "ANDROID_HOME" "$PROFILE_FILE"; then
  echo "" >> "$PROFILE_FILE"
  echo "# Android SDK" >> "$PROFILE_FILE"
  echo "export ANDROID_HOME=$ANDROID_SDK_ROOT" >> "$PROFILE_FILE"
  echo "export ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT" >> "$PROFILE_FILE"
  echo 'export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"' >> "$PROFILE_FILE"
  echo "[ok] Variáveis de ambiente adicionadas ao $PROFILE_FILE"
else
  echo "[ok] Variáveis de ambiente já configuradas."
fi

# Aplica no shell atual
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

# ── 5. SDK packages necessários ─────────────────────────────────────────────
echo "[...] Aceitando licenças e instalando SDK packages..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0"
echo "[ok] SDK packages instalados."

# ── 6. Gradle cache (opcional mas acelera o primeiro build) ─────────────────
GRADLE_VERSION="8.10.2"
GRADLE_DIR="$HOME/.gradle/wrapper/dists"
if [ -d "$GRADLE_DIR/gradle-${GRADLE_VERSION}-bin" ] 2>/dev/null; then
  echo "[ok] Gradle $GRADLE_VERSION já em cache."
else
  echo "[...] Pré-baixando Gradle $GRADLE_VERSION..."
  mkdir -p "$GRADLE_DIR"
  wget -q --show-progress \
    "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" \
    -O "/tmp/gradle.zip"
  unzip -q "/tmp/gradle.zip" -d "/tmp/gradle-extracted"
  mkdir -p "$GRADLE_DIR/gradle-${GRADLE_VERSION}-bin/$(echo $GRADLE_VERSION | md5sum | cut -d' ' -f1)"
  cp "/tmp/gradle.zip" "$GRADLE_DIR/gradle-${GRADLE_VERSION}-bin/" 2>/dev/null || true
  rm -rf /tmp/gradle.zip /tmp/gradle-extracted
  echo "[ok] Gradle em cache."
fi

# ── 7. Verificação final ────────────────────────────────────────────────────
echo ""
echo "=== Verificação ==="
echo "Java:         $(java -version 2>&1 | head -1)"
echo "sdkmanager:   $(sdkmanager --version 2>/dev/null || echo 'não encontrado — rode: source ~/.bashrc')"
echo "ANDROID_HOME: $ANDROID_HOME"
echo ""
echo "=== Pronto! ==="
echo ""
echo "Execute para carregar as variáveis no shell atual:"
echo "  source ~/.bashrc"
echo ""
echo "Para buildar o APK de staging localmente:"
echo "  cd apps/mobile"
echo "  npm run build:local:staging"
echo ""
echo "Para rodar o servidor de dev (conectar pelo Expo Go ou dev build):"
echo "  npm run start:staging"

#!/bin/bash
# ============================================================
# 🛵 УСТАНОВКА BALI MOTO BOT НА VPS
# Запусти одной командой:
# bash install.sh
# ============================================================

set -e

echo "🚀 Установка Bali Moto Bot..."

# 1. Обновляем систему
apt-get update -qq

# 2. Ставим Node.js 20
if ! command -v node &> /dev/null; then
  echo "📦 Устанавливаем Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 3. Ставим PM2 (держит бот запущенным)
if ! command -v pm2 &> /dev/null; then
  echo "📦 Устанавливаем PM2..."
  npm install -g pm2
fi

# 4. Ставим зависимости бота
echo "📦 Устанавливаем зависимости..."
npm install

# 5. Создаём .env если не существует
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  ВАЖНО: Заполни файл .env своими токенами!"
  echo "    nano .env"
  echo ""
fi

# 6. Запускаем через PM2
pm2 delete moto-bot 2>/dev/null || true
pm2 start src/index.js --name moto-bot
pm2 save
pm2 startup

echo ""
echo "✅ Бот установлен и запущен!"
echo ""
echo "📋 Полезные команды:"
echo "   pm2 logs moto-bot     — смотреть логи"
echo "   pm2 restart moto-bot  — перезапустить"
echo "   pm2 stop moto-bot     — остановить"
echo ""
echo "🌐 Webhook URL для Meta:"
echo "   http://$(curl -s ifconfig.me):3000/webhook"
echo ""

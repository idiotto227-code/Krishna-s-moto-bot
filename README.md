# 🛵 Bali Moto Rental — WhatsApp Bot

## Структура проекта

```
moto-bot/
├── src/
│   ├── index.js      — веб-сервер, приём сообщений от WhatsApp
│   ├── bot.js        — вся логика бота (меню, кнопки, сценарии)
│   ├── whatsapp.js   — отправка сообщений через Meta API
│   └── ai.js         — умные ответы через Claude AI
├── config/
│   └── data.js       ← РЕДАКТИРУЙ ЗДЕСЬ: байки, цены, контакты, FAQ
├── .env.example      — шаблон переменных окружения
├── install.sh        — скрипт установки на сервер
└── nginx.conf.example
```

---

## ШАГ 1 — Покупка VPS (5 минут)

1. Идёшь на **hetzner.com** → Sign Up
2. Create Server → выбираешь **CX22** (€3.29/мес)
3. OS: **Ubuntu 24.04**
4. Создать → запомнить **IP адрес** и **пароль root**

---

## ШАГ 2 — Meta Developer Console (30 минут)

### 2.1 Создать приложение
1. Идёшь на **developers.facebook.com** → My Apps → Create App
2. Тип: **Business** → Next
3. Называешь приложение (например "Bali Moto Bot")

### 2.2 Подключить WhatsApp
1. В приложении → Add Product → **WhatsApp** → Set Up
2. Слева появится раздел WhatsApp

### 2.3 Получить токены
Идёшь в **WhatsApp → API Setup**:
- Копируешь **Phone Number ID** → вставляешь в `.env` как `PHONE_NUMBER_ID`
- Копируешь **Temporary access token** → вставляешь в `.env` как `WHATSAPP_TOKEN`

> ⚠️ Временный токен живёт 24 часа. После тестирования нужно сделать постоянный:
> WhatsApp → Configuration → System Users → Generate Permanent Token

### 2.4 Добавить номер телефона (если нет бизнес-номера)
- WhatsApp → Phone Numbers → Add Phone Number
- Верифицируешь через SMS

---

## ШАГ 3 — Запуск бота на сервере (10 минут)

### 3.1 Подключиться к серверу
```bash
ssh root@ВАШ_IP_АДРЕС
```

### 3.2 Загрузить и установить бота
```bash
# Установить git
apt install git -y

# Клонировать (или загрузить через SFTP)
git clone https://github.com/ВАШ_РЕПО/moto-bot.git
cd moto-bot

# Запустить установку
bash install.sh
```

### 3.3 Заполнить токены
```bash
nano .env
```
Вставить свои значения, сохранить (Ctrl+X → Y → Enter)

### 3.4 Перезапустить бота
```bash
pm2 restart moto-bot
pm2 logs moto-bot  # Проверить что запустился
```

---

## ШАГ 4 — Настройка HTTPS (нужен домен)

Meta требует HTTPS. Два варианта:

### Вариант A: Купить домен (~$10/год)
1. Купить домен (namecheap.com, godaddy.com)
2. Направить DNS A-запись на IP сервера
3. Настроить Nginx:
```bash
apt install nginx certbot python3-certbot-nginx -y
cp nginx.conf.example /etc/nginx/sites-available/moto-bot
nano /etc/nginx/sites-available/moto-bot  # заменить YOUR_DOMAIN
ln -s /etc/nginx/sites-available/moto-bot /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d ВАШ_ДОМЕН
```

### Вариант B: ngrok (бесплатно, для теста)
```bash
# Установить ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Запустить туннель
ngrok http 3000
# Скопировать HTTPS URL (типа https://abc123.ngrok.io)
```

---

## ШАГ 5 — Настройка Webhook в Meta (5 минут)

1. Идёшь в **WhatsApp → Configuration → Webhooks**
2. Edit → вставляешь URL: `https://ВАШ_ДОМЕН/webhook`
3. Verify token: `moto_bali_secret_2024` (или что задал в `.env`)
4. Subscribe to: ставишь галочку на **messages**
5. Сохранить

---

## ШАГ 6 — Тест

Напиши "Привет" на тестовый номер WhatsApp из Meta → бот должен ответить!

---

## Редактирование данных

Все данные — байки, цены, FAQ, контакты — в одном файле:
```bash
nano config/data.js
pm2 restart moto-bot  # применить изменения
```

---

## Полезные команды

```bash
pm2 logs moto-bot      # Смотреть логи в реальном времени
pm2 restart moto-bot   # Перезапустить после изменений
pm2 status             # Статус бота
```

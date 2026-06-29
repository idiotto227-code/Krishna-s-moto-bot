const { sendText, sendButtons, sendList } = require("./whatsapp");
const { askClaude } = require("./ai");
const { BIKES, FAQ, CONTACTS } = require("../config/data");

// Храним состояние сессий в памяти (для продакшена можно заменить на Redis)
const sessions = new Map();

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, { lang: "ru", step: "main" });
  }
  return sessions.get(from);
}

// ============================================================
// ТЕКСТЫ НА 3 ЯЗЫКАХ
// ============================================================
const T = {
  ru: {
    welcome: `🛵 *Привет! Добро пожаловать в Bali Moto Rental!*\n\nЯ помогу вам арендовать скутер или байк. Выберите раздел:`,
    bikes: "🏍 Выберите категорию:",
    price: "💰 Прайслист",
    contacts: "📞 Контакты",
    faq: "❓ Вопросы и ответы",
    book: "📅 Забронировать",
    lang: "🌐 Сменить язык",
    back: "◀️ Назад",
    menu: "🏠 Главное меню",
    cat_scooter: "🛵 Скутеры",
    cat_manual: "🏍 Мотоциклы",
    cat_sport: "⚡ Спортивные",
    book_prompt: `📅 *Бронирование*\n\nНапишите одним сообщением:\n\n_Модель, дата начала, количество дней_\n\nПример:\n«Honda Beat, 15 июля, 14 дней»\n\nМы свяжемся с вами в течение 30 минут для подтверждения.`,
    calc_header: "💰 *Расчёт стоимости*\n\n",
    unknown: `Не совсем понял 🤔 Попробуйте выбрать раздел из меню или напишите свой вопрос — я отвечу!`,
    lang_changed: "✅ Язык изменён на русский!",
    list_btn: "Выбрать",
    faq_btn: "Выбрать вопрос",
  },
  en: {
    welcome: `🛵 *Hi! Welcome to Bali Moto Rental!*\n\nI'll help you rent a scooter or motorbike. Choose a section:`,
    bikes: "🏍 Choose a category:",
    price: "💰 Price list",
    contacts: "📞 Contacts",
    faq: "❓ FAQ",
    book: "📅 Book now",
    lang: "🌐 Change language",
    back: "◀️ Back",
    menu: "🏠 Main menu",
    cat_scooter: "🛵 Scooters",
    cat_manual: "🏍 Motorbikes",
    cat_sport: "⚡ Sport bikes",
    book_prompt: `📅 *Booking*\n\nSend one message with:\n\n_Model, start date, number of days_\n\nExample:\n«Honda Beat, July 15, 14 days»\n\nWe'll contact you within 30 minutes to confirm.`,
    calc_header: "💰 *Price calculation*\n\n",
    unknown: `Not sure I understood 🤔 Try choosing from the menu or type your question — I'll answer!`,
    lang_changed: "✅ Language changed to English!",
    list_btn: "Choose",
    faq_btn: "Choose question",
  },
  id: {
    welcome: `🛵 *Halo! Selamat datang di Bali Moto Rental!*\n\nSaya akan membantu Anda menyewa skuter atau motor. Pilih menu:`,
    bikes: "🏍 Pilih kategori:",
    price: "💰 Daftar harga",
    contacts: "📞 Kontak",
    faq: "❓ Pertanyaan",
    book: "📅 Pesan sekarang",
    lang: "🌐 Ganti bahasa",
    back: "◀️ Kembali",
    menu: "🏠 Menu utama",
    cat_scooter: "🛵 Skuter",
    cat_manual: "🏍 Motor manual",
    cat_sport: "⚡ Motor sport",
    book_prompt: `📅 *Pemesanan*\n\nKirim satu pesan dengan:\n\n_Model, tanggal mulai, jumlah hari_\n\nContoh:\n«Honda Beat, 15 Juli, 14 hari»\n\nKami akan menghubungi dalam 30 menit untuk konfirmasi.`,
    calc_header: "💰 *Perhitungan harga*\n\n",
    unknown: `Tidak mengerti 🤔 Coba pilih dari menu atau tulis pertanyaan Anda!`,
    lang_changed: "✅ Bahasa diubah ke Indonesia!",
    list_btn: "Pilih",
    faq_btn: "Pilih pertanyaan",
  },
};

// ============================================================
// ФОРМАТИРОВАНИЕ ДАННЫХ
// ============================================================

function formatBikeCard(bike, lang) {
  const labels = {
    ru: { engine: "Объём", day: "День", week: "Неделя", month: "Месяц" },
    en: { engine: "Engine", day: "Day", week: "Week", month: "Month" },
    id: { engine: "Mesin", day: "Hari", week: "Minggu", month: "Bulan" },
  };
  const l = labels[lang] || labels.ru;
  return (
    `🏍 *${bike.name}*\n` +
    `${l.engine}: ${bike.engine}\n` +
    `${l.day}: ${bike.price_day} 000 IDR\n` +
    `${l.week}: ${bike.price_week} 000 IDR\n` +
    `${l.month}: ${bike.price_month} 000 IDR\n\n` +
    `_${bike.description}_`
  );
}

function formatPriceList(lang) {
  const headers = {
    ru: ["Модель", "День", "Неделя", "Месяц"],
    en: ["Model", "Day", "Week", "Month"],
    id: ["Model", "Hari", "Minggu", "Bulan"],
  };
  const h = headers[lang] || headers.ru;

  let text = `💰 *${T[lang].price}*\n_(цены в тысячах IDR)_\n\n`;

  const cats = {
    ru: { scooter: "🛵 Скутеры", manual: "🏍 Мотоциклы", sport: "⚡ Спортивные" },
    en: { scooter: "🛵 Scooters", manual: "🏍 Motorbikes", sport: "⚡ Sport" },
    id: { scooter: "🛵 Skuter", manual: "🏍 Motor Manual", sport: "⚡ Sport" },
  };
  const c = cats[lang] || cats.ru;

  for (const cat of ["scooter", "manual", "sport"]) {
    const list = BIKES.filter((b) => b.category === cat);
    if (!list.length) continue;
    text += `*${c[cat]}*\n`;
    for (const b of list) {
      text += `• ${b.name}: ${b.price_day}K / ${b.price_week}K / ${b.price_month}K\n`;
    }
    text += "\n";
  }

  const extras = {
    ru: `✅ Депозит: 500K–1M IDR\n✅ Доставка: бесплатно от 7 дней\n✅ Документы: паспорт + права`,
    en: `✅ Deposit: 500K–1M IDR\n✅ Delivery: free from 7 days\n✅ Documents: passport + license`,
    id: `✅ Deposit: 500K–1M IDR\n✅ Pengiriman: gratis dari 7 hari\n✅ Dokumen: paspor + SIM`,
  };
  text += extras[lang] || extras.ru;
  return text;
}

function formatContacts(lang) {
  const labels = {
    ru: `📞 *Наши контакты:*\n\n📱 WhatsApp: ${CONTACTS.whatsapp}\n📍 Адрес: ${CONTACTS.address}\n🕐 Часы: ${CONTACTS.hours}\n📷 Instagram: ${CONTACTS.instagram}\n🗺 Карта: ${CONTACTS.maps}`,
    en: `📞 *Our contacts:*\n\n📱 WhatsApp: ${CONTACTS.whatsapp}\n📍 Address: ${CONTACTS.address}\n🕐 Hours: ${CONTACTS.hours}\n📷 Instagram: ${CONTACTS.instagram}\n🗺 Map: ${CONTACTS.maps}`,
    id: `📞 *Kontak kami:*\n\n📱 WhatsApp: ${CONTACTS.whatsapp}\n📍 Alamat: ${CONTACTS.address}\n🕐 Jam: ${CONTACTS.hours}\n📷 Instagram: ${CONTACTS.instagram}\n🗺 Peta: ${CONTACTS.maps}`,
  };
  return labels[lang] || labels.ru;
}

// ============================================================
// ГЛАВНЫЙ ОБРАБОТЧИК СООБЩЕНИЙ
// ============================================================

async function handleMessage(msg, from, phoneNumberId) {
  const session = getSession(from);
  const lang = session.lang;
  const t = T[lang];

  // Определяем текст сообщения или нажатую кнопку
  let text = "";
  let buttonId = "";

  if (msg.type === "text") {
    text = msg.text.body.trim();
  } else if (msg.type === "interactive") {
    if (msg.interactive.type === "button_reply") {
      buttonId = msg.interactive.button_reply.id;
      text = msg.interactive.button_reply.title;
    } else if (msg.interactive.type === "list_reply") {
      buttonId = msg.interactive.list_reply.id;
      text = msg.interactive.list_reply.title;
    }
  }

  const id = buttonId || text.toLowerCase();

  // ── СМЕНА ЯЗЫКА ──────────────────────────────────────────
  if (id === "lang_ru") {
    session.lang = "ru";
    await sendText(from, phoneNumberId, T.ru.lang_changed);
    return sendMainMenu(from, phoneNumberId, "ru");
  }
  if (id === "lang_en") {
    session.lang = "en";
    await sendText(from, phoneNumberId, T.en.lang_changed);
    return sendMainMenu(from, phoneNumberId, "en");
  }
  if (id === "lang_id") {
    session.lang = "id";
    await sendText(from, phoneNumberId, T.id.lang_changed);
    return sendMainMenu(from, phoneNumberId, "id");
  }

  // ── ВЫБОР ЯЗЫКА (меню) ───────────────────────────────────
  if (id === "menu_lang" || id.includes("язык") || id.includes("language") || id.includes("bahasa")) {
    return sendButtons(from, phoneNumberId, "🌐 Choose language / Выберите язык / Pilih bahasa:", [
      { id: "lang_ru", title: "🇷🇺 Русский" },
      { id: "lang_en", title: "🇬🇧 English" },
      { id: "lang_id", title: "🇮🇩 Indonesia" },
    ]);
  }

  // ── НАЗАД / ГЛАВНОЕ МЕНЮ ─────────────────────────────────
  if (id === "menu_main" || id === "back" || id.match(/^(меню|menu|start|привет|hi|hello|halo|mulai)$/)) {
    return sendMainMenu(from, phoneNumberId, lang);
  }

  // ── ПРАЙСЛИСТ ────────────────────────────────────────────
  if (id === "menu_price" || id.includes("прайс") || id.includes("price") || id.includes("harga")) {
    await sendText(from, phoneNumberId, formatPriceList(lang));
    return sendButtons(from, phoneNumberId, "Что дальше?", [
      { id: "menu_bikes", title: t.cat_scooter },
      { id: "menu_book", title: t.book },
      { id: "menu_main", title: t.menu },
    ]);
  }

  // ── КОНТАКТЫ ─────────────────────────────────────────────
  if (id === "menu_contacts" || id.includes("контакт") || id.includes("contact") || id.includes("kontak")) {
    await sendText(from, phoneNumberId, formatContacts(lang));
    return sendButtons(from, phoneNumberId, "Что дальше?", [
      { id: "menu_book", title: t.book },
      { id: "menu_main", title: t.menu },
      { id: "menu_lang", title: t.lang },
    ]);
  }

  // ── БАЙКИ — КАТЕГОРИИ ────────────────────────────────────
  if (id === "menu_bikes" || id.includes("байк") || id.includes("bike") || id.includes("motor")) {
    return sendButtons(from, phoneNumberId, t.bikes, [
      { id: "cat_scooter", title: t.cat_scooter },
      { id: "cat_manual", title: t.cat_manual },
      { id: "cat_sport", title: t.cat_sport },
    ]);
  }

  // ── БАЙКИ — СПИСОК ПО КАТЕГОРИИ ──────────────────────────
  if (id === "cat_scooter" || id === "cat_manual" || id === "cat_sport") {
    const catMap = { cat_scooter: "scooter", cat_manual: "manual", cat_sport: "sport" };
    const cat = catMap[id];
    const list = BIKES.filter((b) => b.category === cat);

    const sections = [
      {
        title: t[`cat_${cat}`] || cat,
        rows: list.map((b) => ({
          id: `bike_${b.id}`,
          title: b.name.slice(0, 24),
          description: `${b.price_day}K/день · ${b.price_month}K/мес`,
        })),
      },
    ];

    return sendList(from, phoneNumberId, t.bikes, t.list_btn, sections);
  }

  // ── КОНКРЕТНЫЙ БАЙК ──────────────────────────────────────
  if (id.startsWith("bike_")) {
    const bikeId = id.replace("bike_", "");
    const bike = BIKES.find((b) => b.id === bikeId);
    if (bike) {
      await sendText(from, phoneNumberId, formatBikeCard(bike, lang));
      return sendButtons(from, phoneNumberId, "Что дальше?", [
        { id: "menu_book", title: t.book },
        { id: "menu_bikes", title: t.back },
        { id: "menu_main", title: t.menu },
      ]);
    }
  }

  // ── FAQ ───────────────────────────────────────────────────
  if (id === "menu_faq" || id.includes("faq") || id.includes("вопрос") || id.includes("pertanyaan")) {
    const sections = [
      {
        title: "FAQ",
        rows: FAQ.map((f, i) => ({
          id: `faq_${i}`,
          title: f.q.slice(0, 24),
        })),
      },
    ];
    return sendList(from, phoneNumberId, "❓ Выберите вопрос:", t.faq_btn, sections);
  }

  if (id.startsWith("faq_")) {
    const idx = parseInt(id.replace("faq_", ""));
    const item = FAQ[idx];
    if (item) {
      await sendText(from, phoneNumberId, `*${item.q}*\n\n${item.a}`);
      return sendButtons(from, phoneNumberId, "Что дальше?", [
        { id: "menu_faq", title: t.faq },
        { id: "menu_book", title: t.book },
        { id: "menu_main", title: t.menu },
      ]);
    }
  }

  // ── БРОНИРОВАНИЕ ─────────────────────────────────────────
  if (id === "menu_book" || id.includes("брон") || id.includes("book") || id.includes("pesan")) {
    return sendText(from, phoneNumberId, t.book_prompt);
  }

  // ── AI — ПРОИЗВОЛЬНЫЙ ВОПРОС ─────────────────────────────
  const aiReply = await askClaude(text, lang);
  if (aiReply) {
    await sendText(from, phoneNumberId, aiReply);
    return sendButtons(from, phoneNumberId, "Что дальше?", [
      { id: "menu_price", title: t.price },
      { id: "menu_book", title: t.book },
      { id: "menu_main", title: t.menu },
    ]);
  }

  // ── НЕИЗВЕСТНОЕ СООБЩЕНИЕ ────────────────────────────────
  await sendText(from, phoneNumberId, t.unknown);
  return sendMainMenu(from, phoneNumberId, lang);
}

// ── ГЛАВНОЕ МЕНЮ ─────────────────────────────────────────────
async function sendMainMenu(from, phoneNumberId, lang) {
  const t = T[lang];
  // WhatsApp позволяет максимум 3 кнопки, используем список для большего меню
  const sections = [
    {
      title: "📋 Меню",
      rows: [
        { id: "menu_bikes", title: t.cat_scooter + " / " + t.cat_manual, description: t.bikes },
        { id: "menu_price", title: t.price },
        { id: "menu_faq", title: t.faq },
        { id: "menu_book", title: t.book },
        { id: "menu_contacts", title: t.contacts },
        { id: "menu_lang", title: t.lang },
      ],
    },
  ];
  return sendList(from, phoneNumberId, T[lang].welcome, "📋 Меню", sections);
}

module.exports = { handleMessage };

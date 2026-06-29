const axios = require("axios");
const { BIKES, FAQ, CONTACTS } = require("../config/data");

const { CLAUDE_API_KEY } = process.env;

// Формируем контекст о бизнесе для Claude
function buildContext() {
  const bikeList = BIKES.map(
    (b) =>
      `- ${b.name} (${b.engine}): ${b.price_day}K IDR/день, ${b.price_week}K IDR/неделя, ${b.price_month}K IDR/месяц. ${b.description}`
  ).join("\n");

  const faqList = FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  return `Ты — помощник сервиса аренды мотоциклов и скутеров Bali Moto Rental.
Отвечай коротко, дружелюбно, на том языке, на котором пишет клиент (русский, английский, индонезийский).
Не придумывай информацию — опирайся только на данные ниже.

КОНТАКТЫ:
WhatsApp: ${CONTACTS.whatsapp}
Адрес: ${CONTACTS.address}
Часы работы: ${CONTACTS.hours}
Instagram: ${CONTACTS.instagram}

БАЙКИ И ЦЕНЫ (цены в тысячах IDR):
${bikeList}

ДЕПОЗИТ: 500 000 – 1 000 000 IDR в зависимости от модели.
ДОСТАВКА: бесплатно при аренде от 7 дней, иначе 50 000 IDR.
ДОКУМЕНТЫ: паспорт + мотоциклетные права категории A.

FAQ:
${faqList}

Если клиент хочет забронировать — попроси написать: модель, дату начала и количество дней.
Если вопрос выходит за рамки аренды — вежливо скажи, что можешь помочь только с вопросами аренды.`;
}

async function askClaude(userMessage, lang = "ru") {
  if (!CLAUDE_API_KEY) {
    return null; // Если ключа нет — вернём null, бот ответит стандартно
  }

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: buildContext(),
        messages: [{ role: "user", content: userMessage }],
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.content[0].text;
  } catch (err) {
    console.error("❌ Claude API error:", err.response?.data || err.message);
    return null;
  }
}

module.exports = { askClaude };

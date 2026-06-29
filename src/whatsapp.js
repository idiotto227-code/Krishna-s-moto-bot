const axios = require("axios");

const { WHATSAPP_TOKEN, PHONE_NUMBER_ID } = process.env;

const BASE_URL = `https://graph.facebook.com/v19.0`;

// Отправить текстовое сообщение
async function sendText(to, phoneNumberId, text) {
  await api(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

// Отправить список кнопок (максимум 3 кнопки)
async function sendButtons(to, phoneNumberId, body, buttons) {
  const rows = buttons.map((b, i) => ({
    type: "reply",
    reply: { id: b.id || `btn_${i}`, title: b.title.slice(0, 20) },
  }));

  await api(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: { buttons: rows },
    },
  });
}

// Отправить список пунктов (до 10 пунктов — для длинных меню)
async function sendList(to, phoneNumberId, body, buttonTitle, sections) {
  await api(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: buttonTitle,
        sections,
      },
    },
  });
}

// Базовый запрос к Meta API
async function api(phoneNumberId, data) {
  try {
    await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      data,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("❌ API error:", err.response?.data || err.message);
  }
}

module.exports = { sendText, sendButtons, sendList };

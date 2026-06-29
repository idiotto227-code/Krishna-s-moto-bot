const express = require("express");
const axios = require("axios");
const { handleMessage } = require("./bot");

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, PORT = 3000 } = process.env;

// Верификация webhook от Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Входящие сообщения от WhatsApp
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Сразу отвечаем Meta (иначе повторит запрос)

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages) return;

    const msg = value.messages[0];
    const from = msg.from; // Номер телефона отправителя
    const phoneNumberId = value.metadata.phone_number_id;

    await handleMessage(msg, from, phoneNumberId);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Bot running on port ${PORT}`);
});

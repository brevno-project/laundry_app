const express = require('express');
const app = express();

const BOT_TOKEN = '8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY';
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', bot: '@keiin_dorm_laundry_bot', time: new Date().toISOString() });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    const message = update?.message;
    
    if (!message?.text) {
      return res.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from?.first_name || 'друг';

    if (text === '/start') {
      await sendMessage(chatId, 
        `👋 *Привет, ${firstName}!*\n\n🔑 *Ваш Chat ID:*\n\`${chatId}\`\n\n📱 Скопируйте число выше и вставьте в приложение для подключения уведомлений!`
      );
    } else if (text === '/help') {
      await sendMessage(chatId, '🧺 *Бот очереди на стирку*\n\n/start - Получить Chat ID\n/help - Справка');
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    res.json({ ok: true });
  }
});

async function sendMessage(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } catch (e) {
    console.error('Send error:', e);
  }
}

app.listen(PORT, () => {
  console.log(`✅ Webhook server running on port ${PORT}`);
});

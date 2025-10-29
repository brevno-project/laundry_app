import type { NextApiRequest, NextApiResponse } from 'next';

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

// Отправка сообщения в Telegram
async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Telegram webhook is active (Pages API)',
      bot: '@keiin_dorm_laundry_bot',
    });
  }

  if (req.method === 'POST') {
    try {
      const update: TelegramUpdate = req.body;
      
      console.log('📨 Received update:', update.update_id);

      if (!update.message || !update.message.text) {
        return res.status(200).json({ ok: true });
      }

      const { message } = update;
      const chatId = message.chat.id;
      const text = message.text;
      const firstName = message.from?.first_name || 'друг';

      console.log(`💬 Message from ${firstName} (${chatId}): ${text}`);

      if (text === '/start') {
        const responseText = (
          `👋 *Привет, ${firstName}!*\n\n` +
          `🔑 *Ваш Chat ID:*\n` +
          `\`${chatId}\`\n\n` +
          `📱 *Что делать дальше:*\n` +
          `1️⃣ Скопируйте число выше\n` +
          `2️⃣ Откройте приложение очереди\n` +
          `3️⃣ Вставьте Chat ID в поле\n` +
          `4️⃣ Нажмите 'Подключить уведомления'\n\n` +
          `✅ Теперь вы будете получать уведомления!`
        );
        await sendMessage(chatId, responseText);
      } else if (text === '/help') {
        const helpText = (
          `🧺 *Бот очереди на стирку*\n\n` +
          `*Команды:*\n` +
          `/start - Получить Chat ID\n` +
          `/help - Справка`
        );
        await sendMessage(chatId, helpText);
      } else {
        await sendMessage(chatId, 'Используйте /start для получения Chat ID');
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('❌ Error:', error);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

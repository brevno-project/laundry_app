import type { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';

interface TelegramUpdate {
  update_id: number;
  message?: {
    from?: { id: number; first_name: string };
    chat: { id: number };
    text?: string;
  };
}

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.json({ status: 'ok', message: 'Webhook active', bot: '@keiin_dorm_laundry_bot' });
  }

  if (req.method === 'POST') {
    const update: TelegramUpdate = req.body;
    const message = update.message;
    
    if (!message?.text) return res.json({ ok: true });

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

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

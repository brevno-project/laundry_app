const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '8008452513:AAFFoaZm8PGPHIllv8DG9Oirtmm1Aq-LidY';

async function sendMessage(chatId: number, text: string) {
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

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Vercel Function works!', 
      bot: '@keiin_dorm_laundry_bot',
      time: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    try {
      const update = req.body;
      const message = update?.message;
      
      if (!message?.text) {
        return res.status(200).json({ ok: true });
      }

      const chatId = message.chat.id;
      const text = message.text;
      const firstName = message.from?.first_name || 'друг';

      if (text === '/start') {
        await sendMessage(chatId, 
          `👋 *Привет, ${firstName}!*\n\n🔑 *Ваш Chat ID:*\n\`${chatId}\`\n\n📱 Скопируйте число выше и вставьте в приложение!`
        );
      } else if (text === '/help') {
        await sendMessage(chatId, '🧸 *Бот*\n\n/start - Chat ID\n/help - Справка');
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

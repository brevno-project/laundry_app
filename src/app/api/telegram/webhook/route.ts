import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      if (text === '/start') {
        const message = 
          `👋 Привет! Бот уведомлений прачечной Keiin Dorm.\n\n` +
          `🔗 Подключение:\n` +
          `1️⃣ В этом боте напишите /chatid\n` +
          `2️⃣ Скопируйте Chat ID\n` + 
          `3️⃣ Вставьте в настройки приложения\n` + 
          `4️⃣ В Telegram: включите уведомления от бота\n\n` +
          `📱 Уведомления о:\n` +
          `• Очереди стирки\n` +
          `• Возврате ключа\n` + 
          `• Статусе стирки\n\n` +
          `❓ Chat ID - уникальный номер чата\n\n` +
          `⚠️ Включите уведомления в Telegram!\n\n` +
          `💡 Наслаждайтесь автоматическими оповещениями!`;
        
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message })
        });
      }
      
      if (text === '/help') {
        const helpMessage = 
          `1. В этом боте напишите /chatid\n` +
          `2. Скопируйте Chat ID\n` +
          `3. Вставьте в приложение\n` +
          `4. Включите уведомления в Telegram\n\n` +
          `Готово! Вы получите все уведомления о стирке.`;
        
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: helpMessage })
        });
      }

      if (text === '/chatid') {
        const chatIdMessage = 
          `🆔 Ваш Chat ID: \`${chatId}\`\n\n` +
          `📋 Скопируйте этот номер и вставьте в настройки приложения Laundry.\n\n` +
          `⚠️ Не делитесь Chat ID с посторонними!\n\n` +
          `💡 После вставки Chat ID включите уведомления от бота в Telegram.`;
        
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: chatIdMessage,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📋 Скопировать Chat ID',
                    callback_data: `copy_chatid_${chatId}`
                  }
                ]
              ]
            }
          })
        });
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';

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
async function sendMessage(chatId: number, text: string, parseMode: string = 'Markdown') {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      console.error('Telegram API error:', await response.text());
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Обработка команды /start
function handleStart(chatId: number, firstName: string) {
  const message = (
    `👋 *Привет, ${firstName}!*\n\n` +
    `🔑 *Ваш Chat ID:*\n` +
    `\`${chatId}\`\n\n` +
    `📱 *Что делать дальше:*\n` +
    `1️⃣ Скопируйте число выше (нажмите на него)\n` +
    `2️⃣ Откройте приложение очереди\n` +
    `3️⃣ Вставьте Chat ID в поле\n` +
    `4️⃣ Нажмите 'Подключить уведомления'\n\n` +
    `✅ После этого вы будете получать уведомления о вашей очереди!`
  );
  
  return sendMessage(chatId, message);
}

// Обработка команды /help
function handleHelp(chatId: number) {
  const message = (
    `🧺 *Бот очереди на стирку*\n\n` +
    `*Доступные команды:*\n` +
    `/start - Получить ваш Chat ID\n` +
    `/help - Показать эту справку\n\n` +
    `*Как подключить уведомления:*\n` +
    `1. Напишите /start\n` +
    `2. Скопируйте Chat ID\n` +
    `3. Вставьте в приложение\n` +
    `4. Готово! ✅`
  );
  
  return sendMessage(chatId, message);
}

// Webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();
    
    console.log('📨 Received update:', update.update_id);

    // Проверка наличия сообщения
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from?.first_name || 'друг';

    console.log(`💬 Message from ${firstName} (${chatId}): ${text}`);

    // Обработка команд
    if (text === '/start') {
      await handleStart(chatId, firstName);
    } else if (text === '/help') {
      await handleHelp(chatId);
    } else {
      // Неизвестная команда
      await sendMessage(
        chatId,
        `Используйте команду /start чтобы получить ваш Chat ID\nИли /help для справки`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET endpoint для проверки что webhook работает
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook is active',
    bot: '@keiin_dorm_laundry_bot',
  });
}

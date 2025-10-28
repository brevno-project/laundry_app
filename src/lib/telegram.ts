// Telegram Bot API для отправки уведомлений

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

export interface TelegramNotification {
  type: 'joined' | 'left' | 'washing_started' | 'washing_done';
  userName: string;
  userRoom?: string;
  washCount?: number;
  paymentType?: string;
  queueLength?: number;
}

// Форматирование сообщения
function formatMessage(notification: TelegramNotification): string {
  const { type, userName, userRoom, washCount, paymentType, queueLength } = notification;
  
  const roomInfo = userRoom ? ` (${userRoom})` : '';
  
  switch (type) {
    case 'joined':
      return `🧺 *Новый в очереди!*\n\n👤 ${userName}${roomInfo}\n🔢 Стирок: ${washCount || 1}\n💰 Оплата: ${paymentType === 'coupon' ? '🎫 Купон' : '💵 Деньги'}\n\n📊 Всего в очереди: ${queueLength} чел.`;
    
    case 'left':
      return `❌ *Покинул очередь*\n\n👤 ${userName}${roomInfo}\n\n📊 Осталось: ${queueLength} чел.`;
    
    case 'washing_started':
      return `🟢 *Стирка началась!*\n\n👤 ${userName}${roomInfo}\n🔢 Стирок: ${washCount || 1}\n\n⏳ Не забудь выдать ключ!`;
    
    case 'washing_done':
      return `✅ *Стирка завершена!*\n\n👤 ${userName}${roomInfo}\n\n🔑 Ключ должен быть возвращен!`;
    
    default:
      return `📋 Обновление очереди`;
  }
}

// Отправка уведомления в Telegram
export async function sendTelegramNotification(notification: TelegramNotification): Promise<boolean> {
  // Проверка наличия токена и chat ID
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram bot not configured. Set NEXT_PUBLIC_TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_TELEGRAM_CHAT_ID');
    return false;
  }

  try {
    const message = formatMessage(notification);
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }

    console.log('✅ Telegram notification sent:', notification.type);
    return true;
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error);
    return false;
  }
}

// Тестовое уведомление (для проверки настройки)
export async function sendTestNotification(): Promise<boolean> {
  return sendTelegramNotification({
    type: 'joined',
    userName: 'Тестовый Пользователь',
    userRoom: 'A501',
    washCount: 2,
    paymentType: 'money',
    queueLength: 5,
  });
}

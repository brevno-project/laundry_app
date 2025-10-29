// Telegram Bot API для отправки уведомлений
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || ''; // ID админа

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface TelegramNotification {
  type: 'joined' | 'left' | 'washing_started' | 'washing_done' | 'admin_call_for_key' | 'admin_key_issued' | 'admin_return_key';
  userName: string;
  userRoom?: string;
  washCount?: number;
  paymentType?: string;
  queueLength?: number;
  position?: number;
  studentId?: string; // ID студента для поиска его telegram_chat_id
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
    
    case 'admin_call_for_key':
      return `🔔 *ВАША ОЧЕРЕДЬ!*\n\n👤 ${userName}${roomInfo}\n\n🔑 Подойдите в A501 за ключом!\n💵 Возьмите деньги/купон`;
    
    case 'admin_key_issued':
      return `✅ *Ключ выдан!*\n\n👤 ${userName}${roomInfo}\n\n🧺 Можете идти к машинке`;
    
    case 'admin_return_key':
      return `⏰ *ПРИНЕСИТЕ КЛЮЧ!*\n\n👤 ${userName}${roomInfo}\n\n🔑 Верните ключ в A501 как можно скорее!`;
    
    default:
      return `📋 Обновление очереди`;
  }
}

// Получить telegram_chat_id студента из базы
async function getStudentTelegramChatId(studentId?: string, userRoom?: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseKey) return null;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Сначала попробовать найти по studentId
  if (studentId) {
    const { data, error } = await supabase
      .from('students')
      .select('telegram_chat_id')
      .eq('id', studentId)
      .single();
    
    if (!error && data?.telegram_chat_id) {
      console.log(`✅ Found telegram_chat_id by studentId: ${studentId}`);
      return data.telegram_chat_id;
    }
  }
  
  // Если не нашли по ID, попробовать по комнате
  if (userRoom) {
    const { data, error } = await supabase
      .from('students')
      .select('telegram_chat_id')
      .eq('room', userRoom)
      .single();
    
    if (!error && data?.telegram_chat_id) {
      console.log(`✅ Found telegram_chat_id by room: ${userRoom}`);
      return data.telegram_chat_id;
    }
    
    console.warn(`⚠️ telegram_chat_id not found for room: ${userRoom}, studentId: ${studentId}`);
  }
  
  return null;
}

// Отправка сообщения в Telegram (базовая функция)
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️ Telegram bot token not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
    return false;
  }
}

// Отправка уведомления в Telegram
export async function sendTelegramNotification(notification: TelegramNotification): Promise<boolean> {
  const message = formatMessage(notification);
  
  // Типы уведомлений для СТУДЕНТА (персональные)
  const studentNotifications = ['admin_call_for_key', 'admin_key_issued', 'admin_return_key'];
  
  // Типы уведомлений для АДМИНА
  const adminNotifications = ['joined', 'left', 'washing_started', 'washing_done'];
  
  let success = false;
  
  // Если это уведомление для студента - найти его chat_id и отправить ЕМУ
  if (studentNotifications.includes(notification.type)) {
    const studentChatId = await getStudentTelegramChatId(notification.studentId, notification.userRoom);
    
    if (studentChatId) {
      success = await sendTelegramMessage(studentChatId, message);
      if (success) {
        console.log(`✅ Telegram notification sent to student (${notification.type})`);
      } else {
        console.warn('⚠️ Failed to send notification to student');
      }
    } else {
      console.warn(`⚠️ Student Telegram not linked (room: ${notification.userRoom})`);
      // Все равно отправить админу как fallback
      if (ADMIN_TELEGRAM_CHAT_ID) {
        await sendTelegramMessage(ADMIN_TELEGRAM_CHAT_ID, `⚠️ Студент не подключил Telegram!\n\n${message}`);
      }
    }
  }
  
  // Если это уведомление для админа - отправить АДМИНУ
  if (adminNotifications.includes(notification.type)) {
    if (ADMIN_TELEGRAM_CHAT_ID) {
      success = await sendTelegramMessage(ADMIN_TELEGRAM_CHAT_ID, message);
      if (success) {
        console.log(`✅ Telegram notification sent to admin (${notification.type})`);
      }
    }
  }
  
  return success;
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

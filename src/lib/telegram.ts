// Telegram Bot API для отправки уведомлений
import { createClient } from '@supabase/supabase-js';
import { TelegramNotification } from '../types/index';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || ''; // ID админа

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Форматирование сообщения
function formatMessage(notification: TelegramNotification): string {
  const { type, full_name, room, wash_count, payment_type, queue_length, expected_finish_at } = notification;
  
  const roomInfo = room ? ` (${room})` : '';
  
  // Форматировать время
  let timeInfo = '';
  if (expected_finish_at) {
    const date = new Date(expected_finish_at);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    timeInfo = `\n⏰ Закончит в: ${hours}:${minutes}`;
  }
  
  switch (type) {
    case 'joined':
      return `🧺 *Новый в очереди!*\n\n👤 ${full_name}${roomInfo}\n🔢 Стирок: ${wash_count || 1}\n💰 Оплата: ${payment_type === 'coupon' ? '🎫 Купон' : '💵 Деньги'}${timeInfo}\n\n📊 Всего в очереди: ${queue_length} чел.`;
    
    case 'left':
      return `❌ *Покинул очередь*\n\n👤 ${full_name}${roomInfo}\n\n📊 Осталось: ${queue_length} чел.`;
    
    case 'washing_started':
      return `🟢 *Стирка началась!*\n\n👤 ${full_name}${roomInfo}\n🔢 Стирок: ${wash_count || 1}\n\n⏳ Не забудь выдать ключ!`;
    
    case 'washing_done':
      return `✅ *Стирка завершена!*\n\n👤 ${full_name}${roomInfo}\n\n🔑 Ключ должен быть возвращен!`;
    
    case 'admin_call_for_key':
      return `🔔 *ВАША ОЧЕРЕДЬ!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🔑 Подойдите в A501 за ключом!\n💵 Возьмите деньги/купон`;
    
    case 'admin_key_issued':
      return `✅ *Ключ выдан!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🧺 Начинайте стираться`;
    
    case 'admin_return_key':
      return `⏰ *ПРИНЕСИТЕ КЛЮЧ!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🔑 Верните ключ в A501 как можно скорее!`;
    
    default:
      return `📋 Обновление очереди`;
  }
}

// Получить telegram_chat_id студента из базы
async function getStudentTelegramChatId(student_id?: string, room?: string): Promise<string | null> {
  console.log(`🔍 Searching telegram_chat_id for:`, { student_id, room });
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase not configured!');
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Сначала попробовать найти по student_id
  if (student_id) {
    console.log(`🔍 Searching by student_id: ${student_id}`);
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, room, telegram_chat_id')
      .eq('id', student_id)
      .single();
    
    if (error) {
      console.error(`❌ Error searching by student_id:`, error);
    } else {
      console.log(`📊 Found student:`, data);
      if (data?.telegram_chat_id) {
        console.log(`✅ Found telegram_chat_id: ${data.telegram_chat_id}`);
        return data.telegram_chat_id;
      } else {
        console.warn(`⚠️ Student found but telegram_chat_id is empty!`);
      }
    }
  }
  
  // Если не нашли по ID, попробовать по комнате
  if (room) {
    console.log(`🔍 Searching by room: ${room}`);
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, room, telegram_chat_id')
      .eq('room', room)
      .single();
    
    if (error) {
      console.error(`❌ Error searching by room:`, error);
    } else {
      console.log(`📊 Found student by room:`, data);
      if (data?.telegram_chat_id) {
        console.log(`✅ Found telegram_chat_id: ${data.telegram_chat_id}`);
        return data.telegram_chat_id;
      } else {
        console.warn(`⚠️ Student found but telegram_chat_id is empty!`);
      }
    }
  }
  
  console.error(`❌ telegram_chat_id NOT FOUND for student_id: ${student_id}, room: ${room}`);
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

  const studentNotifications = [
    'admin_call_for_key',
    'admin_key_issued',
    'admin_return_key',
  ];

  const adminNotifications = [
    'joined',
    'left',
    'washing_started',
    'washing_done',
  ];

  let success = false;

  // 1) личные уведомления студенту
  if (studentNotifications.includes(notification.type)) {
    const studentChatId = await getStudentTelegramChatId(
      notification.student_id,
      notification.room
    );

    if (studentChatId) {
      success = await sendTelegramMessage(studentChatId, message);
      console.log(`✅ sent to student (${notification.type})`);
    } else {
      console.warn(`⚠️ No Telegram for ${notification.room}`);

      // fallback: сообщить админу, что у студента нет телеги
      if (ADMIN_TELEGRAM_CHAT_ID) {
        await sendTelegramMessage(
          ADMIN_TELEGRAM_CHAT_ID,
          `⚠️ Студент не подключил Telegram!\n\n${message}`
        );
      }
    }
  }

  // 2) админские уведомления
  if (adminNotifications.includes(notification.type)) {
    if (ADMIN_TELEGRAM_CHAT_ID) {
      let prefix = '';

      // спецлогика для "joined":
      // сразу говорим админу, есть ли у студента телега
      if (notification.type === 'joined') {
        const studentChatId = await getStudentTelegramChatId(
          notification.student_id,
          notification.room
        );
        if (!studentChatId) {
          prefix = '⚠️ У него НЕТ Telegram подключения!\n\n';
        }
      }

      success = await sendTelegramMessage(
        ADMIN_TELEGRAM_CHAT_ID,
        `${prefix}${message}`
      );

      console.log(`✅ sent to admin (${notification.type})`);
    }
  }

  return success;
}



// Тестовое уведомление (для проверки настройки)
export async function sendTestNotification(): Promise<boolean> {
  return sendTelegramNotification({
    type: 'joined',
    full_name: 'Тестовый Пользователь',
    room: 'A501',
    wash_count: 2,
    payment_type: 'money',
    queue_length: 5,
  });
}

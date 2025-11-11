// Telegram Bot API для отправки уведомлений
import { createClient } from '@supabase/supabase-js';
import { TelegramNotification } from '../types/index';

const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ✅ НОВАЯ ФУНКЦИЯ: Получить информацию об админе
async function getAdminInfo(admin_student_id?: string): Promise<{ full_name: string; room: string; telegram_chat_id: string | null } | null> {
  console.log(`🔍 Getting admin info for:`, admin_student_id);
  
  if (!supabaseUrl || !supabaseKey || !admin_student_id) {
    console.error('❌ Supabase not configured or no admin_student_id!');
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('students')
    .select('full_name, room, telegram_chat_id')
    .eq('id', admin_student_id)
    .single();
  
  if (error) {
    console.error(`❌ Error getting admin info:`, error);
    return null;
  }
  
  console.log(`✅ Admin info:`, data);
  return data;
}

// Форматирование сообщения
async function formatMessage(notification: TelegramNotification): Promise<string> {
  const { type, full_name, room, wash_count, payment_type, queue_length, expected_finish_at, admin_student_id } = notification;
  
  const roomInfo = room ? ` (${room})` : '';
  
  // Форматировать время
  let timeInfo = '';
  if (expected_finish_at) {
    const date = new Date(expected_finish_at);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    timeInfo = `\n⏰ Закончит в: ${hours}:${minutes}`;
  }
  
  // ✅ КРИТИЧНО: Получить информацию об админе для персональных уведомлений
  let adminInfo = null;
  if (admin_student_id && (type === 'admin_call_for_key' || type === 'admin_return_key')) {
    adminInfo = await getAdminInfo(admin_student_id);
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
      // ✅ ИСПРАВЛЕНО: Показываем комнату админа, без fallback на A501
      if (adminInfo && adminInfo.room) {
        return `🔔 *ВАС ЗОВУТ ЗА КЛЮЧОМ!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🏠 Подойдите к комнате: *${adminInfo.room}*\n👨‍💼 Админ: ${adminInfo.full_name}\n\n💵 Не забудьте взять деньги/купон!`;
      }
      console.error('❌ Cannot send call_for_key notification: no admin room info');
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'admin_key_issued':
      return `✅ *Ключ выдан!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🧺 Начинайте стираться`;
    
    case 'admin_return_key':
      // ✅ ИСПРАВЛЕНО: Показываем комнату админа, без fallback на A501
      if (adminInfo && adminInfo.room) {
        return `⏰ *ВЕРНИТЕ КЛЮЧ!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🏠 Верните ключ в комнату: *${adminInfo.room}*\n👨‍💼 Админ: ${adminInfo.full_name}\n\n⚡ Как можно скорее!`;
      }
      console.error('❌ Cannot send return_key notification: no admin room info');
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
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
      .eq('room', room);
    
    if (error) {
      console.error(`❌ Error searching by room:`, error);
    } else {
      console.log(`📊 Found students by room:`, data);
      const studentWithTelegram = data?.find(s => s.telegram_chat_id);
      if (studentWithTelegram?.telegram_chat_id) {
        console.log(`✅ Found telegram_chat_id in room: ${studentWithTelegram.telegram_chat_id}`);
        return studentWithTelegram.telegram_chat_id;
      } else {
        console.warn(`⚠️ No students in room ${room} have telegram_chat_id`);
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

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: Отправка уведомления в Telegram
export async function sendTelegramNotification(notification: TelegramNotification): Promise<boolean> {
  // ✅ КРИТИЧНО: Проверить что есть admin_student_id для админских уведомлений
  if ((notification.type === 'admin_call_for_key' || notification.type === 'admin_return_key') && !notification.admin_student_id) {
    console.error('❌ Cannot send notification: missing admin_student_id for', notification.type);
    return false;
  }

  const message = await formatMessage(notification);
  
  // ✅ КРИТИЧНО: Не отправлять если форматирование не удалось
  if (message.includes('ОШИБКА:')) {
    console.error('❌ Message formatting failed:', message);
    return false;
  }

  const studentNotifications = [
    'admin_call_for_key',     // ✅ Студенту: вас зовут за ключом
    'admin_return_key',       // ✅ Студенту: верните ключ
    'admin_key_issued',       // ✅ Студенту: ключ выдан
  ];
  
  const adminNotifications = [
    'joined',                 // ✅ Админу: кто-то встал в очередь
    'left',                   // ✅ Админу: кто-то вышел
    'washing_started',        // ✅ Админу: стирка началась
    'washing_done',           // ✅ Админу: стирка завершена
  ];

  let success = false;

  // 1) Личные уведомления студенту
  if (studentNotifications.includes(notification.type)) {
    const studentChatId = await getStudentTelegramChatId(
      notification.student_id,
      notification.room
    );

    if (studentChatId) {
      success = await sendTelegramMessage(studentChatId, message);
      console.log(`✅ Sent to student (${notification.type})`);
    } else {
      console.warn(`⚠️ Student has no Telegram: ${notification.full_name}`);
      
      // Fallback: уведомить админа
      if (ADMIN_TELEGRAM_CHAT_ID) {
        await sendTelegramMessage(
          ADMIN_TELEGRAM_CHAT_ID,
          `⚠️ Студент ${notification.full_name} не подключил Telegram!\n\nНе получит уведомление: ${notification.type}`
        );
      }
    }
  }

  // 2) Админские уведомления
  if (adminNotifications.includes(notification.type)) {
    const chatId = ADMIN_TELEGRAM_CHAT_ID;
    
    if (chatId) {
      let prefix = '';

      // Для "joined": сразу сообщить есть ли у студента телеграм
      if (notification.type === 'joined') {
        const studentChatId = await getStudentTelegramChatId(
          notification.student_id,
          notification.room
        );
        if (!studentChatId) {
          prefix = '⚠️ У него НЕТ Telegram!\n\n';
        }
      }

      success = await sendTelegramMessage(
        chatId,
        `${prefix}${message}`
      );

      console.log(`✅ Sent to admin (${notification.type})`);
    }
  }

  return success;
}

// Тестовое уведомление (для проверки настройки)
export async function sendTestNotification(adminStudentId?: string): Promise<boolean> {
  return sendTelegramNotification({
    type: 'admin_call_for_key',
    full_name: 'Тестовый Пользователь',
    room: 'B201',
    wash_count: 2,
    payment_type: 'money',
    queue_length: 5,
    expected_finish_at: new Date().toISOString(),
    admin_student_id: adminStudentId,
    student_id: 'test-student-id',
  });
}
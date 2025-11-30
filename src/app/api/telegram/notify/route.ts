import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Секретные переменные (только на сервере!)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Типы уведомлений
type NotificationType = 
  | 'joined' 
  | 'left' 
  | 'washing_started' 
  | 'washing_done'
  | 'admin_call_for_key'
  | 'admin_key_issued'
  | 'admin_return_key'
  | 'key_issued'  // Ключ выдан студенту
  | 'washing_started_by_student'  // Студент нажал "Начал стирать"
  | 'washing_finished'  // Студент нажал "Закончил стирать"
  | 'return_key_reminder';  // Напоминание вернуть ключ

interface TelegramNotification {
  type: NotificationType;
  full_name: string;
  room?: string;
  wash_count?: number;
  payment_type?: string;
  queue_length?: number;
  expected_finish_at?: string;
  student_id?: string;
  admin_student_id?: string;
}

// Получить информацию об админе
async function getAdminInfo(admin_student_id?: string): Promise<{ full_name: string; room: string; telegram_chat_id: string | null } | null> {
  if (!supabaseUrl || !supabaseKey || !admin_student_id) {
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('students')
    .select('full_name, room, telegram_chat_id')
    .eq('id', admin_student_id)
    .single();
  
  if (error) {
    return null;
  }
  
  return data;
}

// Получить telegram_chat_id студента
async function getStudentTelegramChatId(student_id?: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseKey || !student_id) {
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('students')
    .select('telegram_chat_id, full_name')
    .eq('id', student_id)
    .single();
  
  if (error || !data?.telegram_chat_id) {
    return null;
  }
  
  return data.telegram_chat_id;
}

// ✅ Получить telegram_chat_id всех админов
async function getAllAdminChatIds(): Promise<string[]> {
  if (!supabaseUrl || !supabaseKey) {
    return [];
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('students')
    .select('telegram_chat_id')
    .eq('is_admin', true)
    .not('telegram_chat_id', 'is', null);
  
  if (error) {
    return [];
  }
  
  const chatIds = data
    .map(student => student.telegram_chat_id)
    .filter((id): id is string => id !== null && id !== undefined);
  
  return chatIds;
}

// Форматирование сообщения
async function formatMessage(notification: TelegramNotification): Promise<string> {
  const { type, full_name, room, wash_count, payment_type, queue_length, expected_finish_at, admin_student_id } = notification;
  
  const roomInfo = room ? ` (${room})` : '';
  
  let timeInfo = '';
  if (expected_finish_at) {
    const date = new Date(expected_finish_at);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    timeInfo = `\n⏰ Закончит в: ${hours}:${minutes}`;
  }
  
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
      if (adminInfo && adminInfo.room) {
        return `🔔 *ВАС ЗОВУТ ЗА КЛЮЧОМ!*\n\n👤 ${full_name}${timeInfo}\n\n🏠 Подойдите к комнате: *${adminInfo.room}*\n👨‍💼 Админ: ${adminInfo.full_name}\n\n💵 Не забудьте взять деньги/купон!`;
      }
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'admin_key_issued':
      return `✅ *Ключ выдан!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🧺 Начинайте стираться`;
    
    case 'admin_return_key':
      if (adminInfo && adminInfo.room) {
        return `⏰ *ВЕРНИТЕ КЛЮЧ!*\n\n👤 ${full_name}${timeInfo}\n\n🏠 Верните ключ в комнату: *${adminInfo.room}*\n👨‍💼 Админ: ${adminInfo.full_name}\n\n⚡ Как можно скорее!`;
      }
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'key_issued':
      return `🔑 *КЛЮЧ ВЫДАН!*\n\n👤 ${full_name}${roomInfo}\n📢 Идите к стиралке!\n\n📱 Не забудьте нажать "Начал стирать" в приложении`;
    
    case 'washing_started_by_student':
      return `🌀 *СТУДЕНТ НАЧАЛ СТИРАТЬ!*\n\n👤 ${full_name}${roomInfo}\n✅ Нажал кнопку "Начал стирать"\n\n⏱️ Таймер запущен`;
    
    case 'washing_finished':
      return `✅ *СТУДЕНТ ЗАКОНЧИЛ СТИРАТЬ!*\n\n👤 ${full_name}${roomInfo}\n✅ Нажал кнопку "Закончил стирать"\n\n🔑 Нажмите "Вернуть ключ" чтобы позвать его`;
    
    case 'return_key_reminder':
      return `⚠️ *НАПОМИНАНИЕ!*\n\n👤 ${full_name}${roomInfo}\n🔑 Пожалуйста, верните ключ!\n\n⏱️ Другие студенты ждут своей очереди!`;
    
    default:
      return `📋 Обновление очереди`;
  }
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const notification: TelegramNotification = await request.json();
    
    if (!notification || !notification.type) {
      return NextResponse.json(
        { error: 'Invalid notification data' },
        { status: 400 }
      );
    }

    const message = await formatMessage(notification);
    let success = false;

    // ✅ Уведомления, которые идут ТОЛЬКО студенту
    const studentOnlyNotifications = ['admin_call_for_key', 'admin_return_key', 'key_issued'];
    const isStudentOnly = studentOnlyNotifications.includes(notification.type);
    
    // ✅ Уведомления, которые идут ТОЛЬКО админу
    const adminOnlyNotifications = ['washing_started_by_student', 'washing_finished'];
    const isAdminOnly = adminOnlyNotifications.includes(notification.type);

    // ✅ Отправить ВСЕМ админам (только если это НЕ student-only уведомление)
    if (!isStudentOnly) {
      const adminChatIds = await getAllAdminChatIds();
      
      for (const chatId of adminChatIds) {
        const adminSuccess = await sendTelegramMessage(chatId, message);
        success = success || adminSuccess;
      }
      
      // Также отправить главному админу (если указан в .env)
      if (TELEGRAM_ADMIN_CHAT_ID && !adminChatIds.includes(TELEGRAM_ADMIN_CHAT_ID)) {
        const mainAdminSuccess = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
        success = success || mainAdminSuccess;
      }
    }

    // Отправить студенту (если есть telegram_chat_id И это НЕ admin-only уведомление)
    if (notification.student_id && !isAdminOnly) {
      const studentChatId = await getStudentTelegramChatId(notification.student_id);
      if (studentChatId) {
        const studentSuccess = await sendTelegramMessage(studentChatId, message);
        success = success || studentSuccess;
      } else {
        // ✅ Для student-only уведомлений возвращаем false если у студента нет Telegram
        if (isStudentOnly) {
          return NextResponse.json({ success: false });
        }
      }
    }

    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

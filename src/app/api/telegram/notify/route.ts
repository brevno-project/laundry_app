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
  | 'admin_return_key';

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
  console.log('🔍 getAdminInfo called with admin_student_id:', admin_student_id);
  
  if (!supabaseUrl || !supabaseKey || !admin_student_id) {
    console.error('❌ Missing required data:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey, admin_student_id });
    return null;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('students')
    .select('full_name, room, telegram_chat_id')
    .eq('id', admin_student_id)
    .single();
  
  if (error) {
    console.error('❌ Error getting admin info:', error);
    return null;
  }
  
  console.log('✅ Admin info retrieved:', data);
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
    .select('telegram_chat_id')
    .eq('id', student_id)
    .single();
  
  if (error || !data?.telegram_chat_id) {
    return null;
  }
  
  return data.telegram_chat_id;
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
        return `🔔 *ВАС ЗОВУТ ЗА КЛЮЧОМ!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🏠 Подойдите к комнате: *${adminInfo.room}*\n👨‍💼 Админ: ${adminInfo.full_name}\n\n💵 Не забудьте взять деньги/купон!`;
      }
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'admin_key_issued':
      return `✅ *Ключ выдан!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🧺 Начинайте стираться`;
    
    case 'admin_return_key':
      if (adminInfo && adminInfo.room) {
        return `⏰ *ВЕРНИТЕ КЛЮЧ!*\n\n👤 ${full_name}${roomInfo}${timeInfo}\n\n🏠 Верните ключ в комнату: *${adminInfo.room}*\n👨‍💼 Админ: ${adminInfo.full_name}\n\n⚡ Как можно скорее!`;
      }
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    default:
      return `📋 Обновление очереди`;
  }
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
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
      console.error('Telegram API error:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
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

    // Отправить админу
    if (TELEGRAM_ADMIN_CHAT_ID) {
      const adminSuccess = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
      success = adminSuccess;
    }

    // Отправить студенту (если есть telegram_chat_id)
    if (notification.student_id) {
      const studentChatId = await getStudentTelegramChatId(notification.student_id);
      if (studentChatId) {
        const studentSuccess = await sendTelegramMessage(studentChatId, message);
        success = success || studentSuccess;
      }
    }

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error in telegram notify API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

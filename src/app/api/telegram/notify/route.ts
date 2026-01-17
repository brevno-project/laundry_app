import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

// ✅ Секретные переменные (только на сервере!)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

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
  queue_item_id?: string;
  message?: string;
}

// Получить информацию об админе
async function getAdminInfo(admin_student_id?: string): Promise<{ full_name: string; room: string; telegram_chat_id: string | null } | null> {
  if (!admin_student_id) {
    return null;
  }
  
  const { data, error } = await admin
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
  console.log('🔍 getStudentTelegramChatId called with student_id:', student_id);
  
  if (!student_id) {
    console.log('❌ Missing student_id');
    return null;
  }
  
  const { data, error } = await admin
    .from('students')
    .select('telegram_chat_id, full_name')
    .eq('id', student_id)
    .single();
  
  console.log('📊 Query result:', { data, error: error?.message });
  
  if (error || !data?.telegram_chat_id) {
    console.log('❌ No telegram_chat_id found for student:', student_id);
    return null;
  }
  
  console.log('✅ Found telegram_chat_id for student:', data.full_name, '- chat_id:', data.telegram_chat_id);
  return data.telegram_chat_id;
}

// ✅ Получить telegram_chat_id всех админов
async function getAllAdminChatIds(): Promise<string[]> {
  const { data, error } = await admin
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

// ✅ Получить всех студентов с telegram_chat_id для массовой рассылки
async function getAllStudentChatIds(): Promise<string[]> {
  const { data, error } = await admin
    .from('students')
    .select('telegram_chat_id')
    .not('telegram_chat_id', 'is', null);
  
  if (error || !data) {
    return [];
  }
  
  return data.map((student: { telegram_chat_id: string }) => student.telegram_chat_id).filter((id: string) => id);
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
      return `🧺 *Новый в очереди!*

👤 ${full_name}${roomInfo}
🔢 Стирок: ${wash_count || 1}
💰 Оплата: ${payment_type === 'coupon' ? '🎫 Купон' : '💵 Деньги'}${timeInfo}

📊 Всего в очереди: ${queue_length} чел.`;
    
    case 'left':
      return `❌ *Покинул очередь*

👤 ${full_name}${roomInfo}

📊 Осталось: ${queue_length} чел.`;
    
    case 'washing_started':
      return `🟢 *Стирка началась!*

👤 ${full_name}${roomInfo}
🔢 Стирок: ${wash_count || 1}

⏳ Не забудь выдать ключ!`;
    
    case 'washing_done':
      return `✅ *Стирка завершена!*

👤 ${full_name}${roomInfo}

🔑 Ключ должен быть возвращен!`;
    
    case 'admin_call_for_key':
      if (adminInfo && adminInfo.room) {
        return `🔔 *ВАС ЗОВУТ ЗА КЛЮЧОМ!*

👤 ${full_name}${timeInfo}

🏠 Подойдите к комнате: *${adminInfo.room}*
👨‍💼 Админ: ${adminInfo.full_name}

💵 Не забудьте взять деньги/купон!`;
      }
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'admin_key_issued':
      return `✅ *Ключ выдан!*

👤 ${full_name}${roomInfo}${timeInfo}

🧺 Начинайте стираться`;
    
    case 'admin_return_key':
      if (adminInfo && adminInfo.room) {
        return `⏰ *ВЕРНИТЕ КЛЮЧ!*

👤 ${full_name}${timeInfo}

🏠 Верните ключ в комнату: *${adminInfo.room}*
👨‍💼 Админ: ${adminInfo.full_name}

⚡ Как можно скорее!`;
      }
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'key_issued':
      return `🔑 *КЛЮЧ ВЫДАН!*

👤 ${full_name}${roomInfo}
📢 Идите к стиралке!

📱 Не забудьте нажать "Начал стирать" в приложении`;
    
    case 'washing_started_by_student':
      return `🌀 *СТУДЕНТ НАЧАЛ СТИРАТЬ!*

👤 ${full_name}${roomInfo}
✅ Нажал кнопку "Начал стирать"

⏱️ Таймер запущен`;
    
    case 'washing_finished':
      return `✅ *СТУДЕНТ ЗАКОНЧИЛ СТИРАТЬ!*

👤 ${full_name}${roomInfo}
✅ Нажал кнопку "Закончил стирать"

🔑 Нажмите "Вернуть ключ" чтобы позвать его`;
    
    case 'return_key_reminder':
      return `⚠️ *НАПОМИНАНИЕ!*

👤 ${full_name}${roomInfo}
🔑 Пожалуйста, верните ключ!

⏱️ Другие студенты ждут своей очереди!`;
    
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
    // 🔐 ПРОВЕРКА АВТОРИЗАЦИИ
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No authorization header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ Invalid token:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notification: TelegramNotification = await request.json();
    
    if (!notification || !notification.type) {
      return NextResponse.json(
        { error: 'Invalid notification data' },
        { status: 400 }
      );
    }

    // Получить данные вызывающего
    const { data: caller, error: callerError } = await admin
      .from('students')
      .select('id, is_admin, is_super_admin, is_banned, full_name')
      .eq('user_id', user.id)
      .single();
    
    if (callerError || !caller || caller.is_banned) {
      console.log('❌ User not found or is banned:', { caller, error: callerError?.message });
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const isAdmin = !!caller.is_admin || !!caller.is_super_admin;
    
    // ✅ Типы уведомлений, которые студенты могут отправлять админам
    const STUDENT_TO_ADMIN_TYPES = ['washing_started_by_student', 'washing_finished'];
    const isStudentToAdmin = STUDENT_TO_ADMIN_TYPES.includes(notification.type);

    // ✅ Админ может отправлять любые уведомления
    if (!isAdmin) {
      // ✅ Не админ: разрешаем только студентские типы
      if (!isStudentToAdmin) {
        console.log('❌ Non-admin trying to send admin-only notification:', notification.type);
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }

      // ✅ Валидация владения: уведомлять можно только про свою запись
      if (!notification.queue_item_id) {
        console.log('❌ Missing queue_item_id for student notification');
        return NextResponse.json(
          { error: 'Missing queue_item_id' },
          { status: 400 }
        );
      }

      // Проверить что queue item принадлежит студенту
      const { data: queueItem, error: qiError } = await admin
        .from('queue')
        .select('id, student_id')
        .eq('id', notification.queue_item_id)
        .single();

      if (qiError || !queueItem) {
        console.log('❌ Queue item not found:', notification.queue_item_id);
        return NextResponse.json(
          { error: 'Queue item not found' },
          { status: 404 }
        );
      }

      // Сравнить владельца: queue.student_id == caller.id
      if (queueItem.student_id !== caller.id) {
        console.log('❌ Student trying to notify about someone else\'s queue item');
        return NextResponse.json(
          { error: 'Forbidden: Not your queue item' },
          { status: 403 }
        );
      }

      // ✅ Принудительно выставляем данные из caller (защита от подмены)
      notification.student_id = caller.id;
      notification.full_name = caller.full_name;
      
      console.log('✅ Authorized student:', caller.full_name, '- notification type:', notification.type);
    } else {
      console.log('✅ Authorized admin:', caller.full_name);
    }
    
    console.log('📨 Telegram notification request:', {
      type: notification.type,
      full_name: notification.full_name,
      student_id: notification.student_id,
      queue_item_id: notification.queue_item_id
    });

    const message = await formatMessage(notification);
    let success = false;

    // ✅ Уведомления, которые идут ТОЛЬКО студенту (от конкретного админа)
    const studentOnlyNotifications = ['admin_call_for_key', 'admin_return_key', 'key_issued', 'return_key_reminder', 'washing_started'];
    const isStudentOnly = studentOnlyNotifications.includes(notification.type);
    
    // ✅ Уведомления, которые идут ТОЛЬКО админу (от студента)
    const adminOnlyNotifications = ['washing_started_by_student', 'washing_finished'];
    const isAdminOnly = adminOnlyNotifications.includes(notification.type);
    
    // ✅ Уведомления, которые идут ВСЕМ админам (общие события очереди)
    const allAdminsNotifications = ['joined', 'left', 'washing_done'];
    const isAllAdmins = allAdminsNotifications.includes(notification.type);
    
    // ✅ Уведомления, которые идут КОНКРЕТНОМУ админу (его личные действия)
    const specificAdminNotifications = ['admin_call_for_key', 'admin_key_issued', 'admin_return_key'];
    const isSpecificAdmin = specificAdminNotifications.includes(notification.type);
    
    console.log('🎯 Notification routing:', { 
      type: notification.type,
      isStudentOnly, 
      isAdminOnly, 
      isAllAdmins,
      isSpecificAdmin,
      admin_student_id: notification.admin_student_id
    });

    // ✅ Отправить ВСЕМ админам (только для общих событий очереди)
    if (isAllAdmins) {
      const adminChatIds = await getAllAdminChatIds();
      console.log('📤 Sending to ALL admins from DB:', adminChatIds.length);
      
      for (const chatId of adminChatIds) {
        const adminSuccess = await sendTelegramMessage(chatId, message);
        if (adminSuccess) console.log('✅ Sent to admin:', chatId);
        success = success || adminSuccess;
      }
      
      // Также отправить главному админу (если указан в .env и не в списке админов БД)
      if (TELEGRAM_ADMIN_CHAT_ID) {
        if (!adminChatIds.includes(TELEGRAM_ADMIN_CHAT_ID)) {
          console.log('📤 Sending to main admin from .env:', TELEGRAM_ADMIN_CHAT_ID);
          const mainAdminSuccess = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
          if (mainAdminSuccess) console.log('✅ Sent to main admin');
          success = success || mainAdminSuccess;
        } else {
          console.log('ℹ️ Main admin already in DB admins list');
        }
      } else {
        console.log('⚠️ TELEGRAM_ADMIN_CHAT_ID not set in .env');
      }
    }
    
    // ✅ Отправить КОНКРЕТНОМУ админу (который выполнил действие)
    if (isSpecificAdmin && notification.admin_student_id) {
      console.log('📤 Sending to specific admin:', notification.admin_student_id);
      const adminInfo = await getAdminInfo(notification.admin_student_id);
      if (adminInfo?.telegram_chat_id) {
        const adminSuccess = await sendTelegramMessage(adminInfo.telegram_chat_id, message);
        if (adminSuccess) console.log('✅ Sent to specific admin');
        success = success || adminSuccess;
      } else {
        console.log('⚠️ Admin has no telegram_chat_id');
      }
    }
    
    // ✅ Отправить админу от студента (washing_started_by_student, washing_finished)
    if (isAdminOnly) {
      const adminChatIds = await getAllAdminChatIds();
      console.log('📤 Sending student notification to ALL admins:', adminChatIds.length);
      
      for (const chatId of adminChatIds) {
        const adminSuccess = await sendTelegramMessage(chatId, message);
        if (adminSuccess) console.log('✅ Sent to admin:', chatId);
        success = success || adminSuccess;
      }
      
      if (TELEGRAM_ADMIN_CHAT_ID && !adminChatIds.includes(TELEGRAM_ADMIN_CHAT_ID)) {
        const mainAdminSuccess = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
        if (mainAdminSuccess) console.log('✅ Sent to main admin');
        success = success || mainAdminSuccess;
      }
    }

    // Отправить студенту (если есть telegram_chat_id И это НЕ admin-only уведомление)
    if (notification.student_id && !isAdminOnly) {
      console.log('👤 Attempting to send notification to student:', notification.student_id);
      const studentChatId = await getStudentTelegramChatId(notification.student_id);
      if (studentChatId) {
        console.log('📤 Sending message to student chat_id:', studentChatId);
        const studentSuccess = await sendTelegramMessage(studentChatId, message);
        console.log('📬 Student notification result:', studentSuccess);
        success = success || studentSuccess;
      } else {
        console.log('⚠️ Student has no telegram_chat_id');
        // ✅ Для student-only уведомлений возвращаем false если у студента нет Telegram
        if (isStudentOnly) {
          console.log('❌ Returning failure for student-only notification');
          return NextResponse.json({ success: false });
        }
      }
    } else {
      console.log('ℹ️ Skipping student notification:', { 
        has_student_id: !!notification.student_id, 
        isAdminOnly 
      });
    }

    console.log('✅ Final notification result:', { success });
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

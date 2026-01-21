import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

// ✅ Секретные переменные (только на сервере!)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

type UiLanguage = "ru" | "en" | "ko" | "ky";

const normalizeUiLanguage = (value: unknown): UiLanguage => {
  if (value === "ru" || value === "en" || value === "ko" || value === "ky") return value;
  return "ru";
};

// Типы уведомлений
type NotificationType = 
  | 'joined'                    // Студент встал в очередь → ВСЕМ админам
  | 'left'                      // Студент покинул очередь → ВСЕМ админам
  | 'washing_started_by_student' // Студент начал стирать → ВСЕМ админам
  | 'washing_finished_by_student'// Студент закончил стирать → ВСЕМ админам
  | 'washing_done'              // Запись завершена → ВСЕМ админам
  | 'admin_call_for_key'        // Админ зовет за ключом → конкретному студенту
  | 'admin_key_issued'          // Админ выдал ключ → конкретному студенту
  | 'admin_return_key'          // Админ просит вернуть ключ → конкретному студенту
  | 'washing_started'          // Стирка началась → конкретному студенту
  | 'washing_finished'          // Стирка завершена → конкретному студенту
  | 'return_key_reminder';      // Напоминание вернуть ключ → конкретному студенту

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

type TelegramRecipient = {
  telegram_chat_id: string;
  ui_language: UiLanguage;
};

// Получить информацию об админе
async function getAdminInfo(admin_student_id?: string): Promise<{ full_name: string; room: string; telegram_chat_id: string | null } | null> {
  if (!admin_student_id) {
    return null;
  }
  
  const { data, error } = await admin
    .from('students')
    .select('full_name, room, telegram_chat_id')
    .eq('id', admin_student_id)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

// Получить данные студента для рассылки
async function getStudentRecipient(student_id?: string): Promise<TelegramRecipient | null> {
  console.log('🔍 getStudentRecipient called with student_id:', student_id);

  if (!student_id) {
    console.log('❌ Missing student_id');
    return null;
  }

  const { data, error } = await admin
    .from('students')
    .select('telegram_chat_id, full_name, ui_language')
    .eq('id', student_id)
    .maybeSingle();

  console.log('📊 Query result:', { data, error: error?.message });

  if (error || !data?.telegram_chat_id) {
    console.log('❌ No telegram_chat_id found for student:', student_id);
    return null;
  }

  console.log('✅ Found telegram_chat_id for student:', data.full_name, '- chat_id:', data.telegram_chat_id);

  return {
    telegram_chat_id: data.telegram_chat_id,
    ui_language: normalizeUiLanguage((data as any).ui_language),
  };
}

// ✅ Получить данные всех админов для рассылки
async function getAllAdminRecipients(): Promise<TelegramRecipient[]> {
  console.log('🔍 Getting all admin recipients...');

  const { data, error } = await admin
    .from('students')
    .select('telegram_chat_id, full_name, is_admin, ui_language')
    .eq('is_admin', true)
    .not('telegram_chat_id', 'is', null);

  if (error) {
    console.error('❌ Error getting admin recipients:', error);
    return [];
  }

  console.log('📊 Admins with telegram:', data);

  const rows =
    ((data as { telegram_chat_id: string | null; ui_language?: unknown }[] | null | undefined) || [])
      .filter((row) => !!row.telegram_chat_id)
      .map((row) => ({
        telegram_chat_id: row.telegram_chat_id as string,
        ui_language: normalizeUiLanguage(row.ui_language),
      }));

  console.log('📤 Admin recipients:', rows.length);
  return rows;
}

// Форматирование сообщения
async function formatMessage(notification: TelegramNotification, ui_language: UiLanguage, isForAdmin: boolean = false): Promise<string> {
  const { type, full_name, room, wash_count, payment_type, queue_length, expected_finish_at, admin_student_id } = notification;
  
  const roomInfo = room ? ` (${room})` : '';
  
  let timeInfo = '';
  if (expected_finish_at) {
    const date = new Date(expected_finish_at);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    if (ui_language === "en") timeInfo = `\n⏰ Finishes at: ${hours}:${minutes}`;
    else if (ui_language === "ko") timeInfo = `\n⏰ 종료 시간: ${hours}:${minutes}`;
    else if (ui_language === "ky") timeInfo = `\n⏰ Аяктоо убактысы: ${hours}:${minutes}`;
    else timeInfo = `\n⏰ Закончит в: ${hours}:${minutes}`;
  }

  const paymentLabel = (() => {
    const isCoupon = payment_type === 'coupon';
    if (ui_language === "en") return isCoupon ? "🎫 Coupon" : "💵 Cash";
    if (ui_language === "ko") return isCoupon ? "🎫 쿠폰" : "💵 현금";
    if (ui_language === "ky") return isCoupon ? "🎫 Купон" : "💵 Нак акча";
    return isCoupon ? "🎫 Купон" : "💵 Деньги";
  })();
  
  let adminInfo = null;
  if (admin_student_id && (type === 'admin_call_for_key' || type === 'admin_return_key')) {
    adminInfo = await getAdminInfo(admin_student_id);
  }
  
  switch (type) {
    case 'joined':
      if (ui_language === "en") {
        return `🧺 *New in queue!*

👤 ${full_name}${roomInfo}
🔢 Washes: ${wash_count || 1}
💰 Payment: ${paymentLabel}${timeInfo}

📊 Total in queue: ${queue_length} ppl.`;
      }
      if (ui_language === "ko") {
        return `🧺 *대기열에 새로 추가!*

👤 ${full_name}${roomInfo}
🔢 세탁 횟수: ${wash_count || 1}
💰 결제: ${paymentLabel}${timeInfo}

📊 대기열 총원: ${queue_length}명`;
      }
      if (ui_language === "ky") {
        return `🧺 *Кезекке жаңы кошулду!*

👤 ${full_name}${roomInfo}
🔢 Жуу саны: ${wash_count || 1}
💰 Төлөм: ${paymentLabel}${timeInfo}

📊 Кезекте жалпы: ${queue_length} адам`;
      }
      return `🧺 *Новый в очереди!*

👤 ${full_name}${roomInfo}
🔢 Стирок: ${wash_count || 1}
💰 Оплата: ${paymentLabel}${timeInfo}

📊 Всего в очереди: ${queue_length} чел.`;
    
    case 'left':
      if (ui_language === "en") {
        return `❌ *Left the queue*

👤 ${full_name}${roomInfo}

📊 Remaining: ${queue_length} ppl.`;
      }
      if (ui_language === "ko") {
        return `❌ *대기열에서 나감*

👤 ${full_name}${roomInfo}

📊 남은 인원: ${queue_length}명`;
      }
      if (ui_language === "ky") {
        return `❌ *Кезектен чыкты*

👤 ${full_name}${roomInfo}

📊 Калганы: ${queue_length} адам`;
      }
      return `❌ *Покинул очередь*

👤 ${full_name}${roomInfo}

📊 Осталось: ${queue_length} чел.`;
    
    case 'washing_started':
      if (ui_language === "en") {
        return `🌀 *WASHING STARTED!*

🎉 Admin confirmed start of washing

👤 ${full_name}${roomInfo}
🔢 Washes: ${wash_count || 1}

⏱️ Timer started
📱 When you finish washing, tap "Finished washing" in the app`;
      }
      if (ui_language === "ko") {
        return `🌀 *세탁 시작!*

🎉 관리자가 세탁 시작을 확인했습니다

👤 ${full_name}${roomInfo}
🔢 세탁 횟수: ${wash_count || 1}

⏱️ 타이머 시작
📱 세탁이 끝나면 앱에서 "세탁 완료" 버튼을 눌러주세요`;
      }
      if (ui_language === "ky") {
        return `🌀 *ЖУУ БАШТАЛДЫ!*

🎉 Админ жуунун башталганын тастыктады

👤 ${full_name}${roomInfo}
🔢 Жуу саны: ${wash_count || 1}

⏱️ Таймер иштеди
📱 Жуу бүткөндө колдонмодон "Жууду бүттүм" баскычын басууну унутпаңыз`;
      }
      return `🌀 *СТИРКА НАЧАТА!*

🎉 Админ подтвердил начало стирки

👤 ${full_name}${roomInfo}
🔢 Стирок: ${wash_count || 1}

⏱️ Таймер запущен
📱 Когда закончите стирать, не забудьте нажать кнопку "Закончил стирать" в приложении`;
    
    case 'washing_done':
      if (isForAdmin) {
        if (ui_language === "en") {
          return `✅ *Washing completed!*

👤 ${full_name}${roomInfo}

✅ Moved to history`;
        }
        if (ui_language === "ko") {
          return `✅ *세탁 완료!*

👤 ${full_name}${roomInfo}

✅ 기록으로 이동됨`;
        }
        if (ui_language === "ky") {
          return `✅ *Жуу аяктады!*

👤 ${full_name}${roomInfo}

✅ Тарыхка көчүрүлдү`;
        }
        return `✅ *Стирка завершена!*

👤 ${full_name}${roomInfo}

✅ Запись перенесена в историю`;
      } else {
        if (ui_language === "en") {
          return `✅ *You completed washing!*

👤 ${full_name}${roomInfo}

📋 Moved to history`;
        }
        if (ui_language === "ko") {
          return `✅ *세탁을 완료했습니다!*

👤 ${full_name}${roomInfo}

📋 기록으로 이동됨`;
        }
        if (ui_language === "ky") {
          return `✅ *Жууну аяктадыңыз!*

👤 ${full_name}${roomInfo}

📋 Тарыхка көчүрүлдү`;
        }
        return `✅ *Вы завершили стирку!*

👤 ${full_name}${roomInfo}

📋 Запись перенесена в историю`;
      }
    
    case 'admin_call_for_key':
      if (adminInfo && adminInfo.room) {
        if (ui_language === "en") {
          return `🔔 *YOU ARE CALLED FOR THE KEY!*

👤 ${full_name}${timeInfo}

🏠 Please come to room: *${adminInfo.room}*
👨‍💼 Admin: ${adminInfo.full_name}

💰 Pay in advance or choose coupons in the app`;
        }
        if (ui_language === "ko") {
          return `🔔 *열쇠 받으러 오세요!*

👤 ${full_name}${timeInfo}

🏠 방으로 오세요: *${adminInfo.room}*
👨‍💼 관리자: ${adminInfo.full_name}

💰 세탁 비용은 미리 결제하거나 앱에서 쿠폰을 선택해주세요`;
        }
        if (ui_language === "ky") {
          return `🔔 *КЛЮЧ ҮЧҮН ЧАКЫРЫЛДЫҢЫЗ!*

👤 ${full_name}${timeInfo}

🏠 Бөлмөгө келиңиз: *${adminInfo.room}*
👨‍💼 Админ: ${adminInfo.full_name}

💰 Жууну алдын ала төлөңүз же колдонмодон купон тандаңыз`;
        }
        return `🔔 *ВАС ЗОВУТ ЗА КЛЮЧОМ!*

👤 ${full_name}${timeInfo}

🏠 Подойдите к комнате: *${adminInfo.room}*
👨‍💼 Админ: ${adminInfo.full_name}

💰 Стирку необходимо оплатить заранее или выбрать купоны в приложении`;
      }
      if (ui_language === "en") return `⚠️ ERROR: Failed to get admin room`;
      if (ui_language === "ko") return `⚠️ 오류: 관리자 방 정보를 가져올 수 없습니다`;
      if (ui_language === "ky") return `⚠️ КАТА: Админдин бөлмөсүн ала алган жокпуз`;
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'admin_key_issued':
      if (ui_language === "en") {
        return `🔑 *KEY ISSUED!*

👤 ${full_name}${roomInfo}
📢 Go to the washer!

📱 Don’t forget to tap "Started washing" in the app`;
      }
      if (ui_language === "ko") {
        return `🔑 *열쇠를 받았습니다!*

👤 ${full_name}${roomInfo}
📢 세탁기로 가세요!

📱 앱에서 "세탁 시작" 버튼을 누르는 것을 잊지 마세요`;
      }
      if (ui_language === "ky") {
        return `🔑 *КЛЮЧ БЕРИЛДИ!*

👤 ${full_name}${roomInfo}
📢 Кир жуу машинасына барыңыз!

📱 Колдонмодон "Жууну баштадым" баскычын басууну унутпаңыз`;
      }
      return `🔑 *КЛЮЧ ВЫДАН!*

👤 ${full_name}${roomInfo}
📢 Идите к стиралке!

📱 Не забудьте нажать "Начал стирать" в приложении`;
    
    case 'admin_return_key':
      if (adminInfo && adminInfo.room) {
        if (ui_language === "en") {
          return `⏰ *RETURN THE KEY!*

👤 ${full_name}${timeInfo}

🏠 Return the key to room: *${adminInfo.room}*
👨‍💼 Admin: ${adminInfo.full_name}

⚡ As soon as possible!`;
        }
        if (ui_language === "ko") {
          return `⏰ *열쇠를 반납해주세요!*

👤 ${full_name}${timeInfo}

🏠 방으로 열쇠를 반납: *${adminInfo.room}*
👨‍💼 관리자: ${adminInfo.full_name}

⚡ 가능한 빨리!`;
        }
        if (ui_language === "ky") {
          return `⏰ *КЛЮЧТУ КАЙТАРЫҢЫЗ!*

👤 ${full_name}${timeInfo}

🏠 Ключту бөлмөгө кайтарыңыз: *${adminInfo.room}*
👨‍💼 Админ: ${adminInfo.full_name}

⚡ Мүмкүн болушунча тез!`;
        }
        return `⏰ *ВЕРНИТЕ КЛЮЧ!*

👤 ${full_name}${timeInfo}

🏠 Верните ключ в комнату: *${adminInfo.room}*
👨‍💼 Админ: ${adminInfo.full_name}

⚡ Как можно скорее!`;
      }
      if (ui_language === "en") return `⚠️ ERROR: Failed to get admin room`;
      if (ui_language === "ko") return `⚠️ 오류: 관리자 방 정보를 가져올 수 없습니다`;
      if (ui_language === "ky") return `⚠️ КАТА: Админдин бөлмөсүн ала алган жокпуз`;
      return `⚠️ ОШИБКА: Не удалось получить комнату админа`;
    
    case 'washing_started_by_student':
      if (ui_language === "en") {
        return `👤 ${full_name}${roomInfo}
✅ Pressed "Started washing"

👨‍💼 Admin, confirm start of washing in the app`;
      }
      if (ui_language === "ko") {
        return `👤 ${full_name}${roomInfo}
✅ "세탁 시작"을 눌렀습니다

👨‍💼 관리자님, 앱에서 세탁 시작을 확인해주세요`;
      }
      if (ui_language === "ky") {
        return `👤 ${full_name}${roomInfo}
✅ "Жууну баштадым" баскычын басты

👨‍💼 Админ, колдонмодон жуунун башталганын тастыктаңыз`;
      }
      return `👤 ${full_name}${roomInfo}
✅ Нажал кнопку "Начал стирать"

👨‍💼 Админ, подтвердите начало стирки в приложении`;
    
    case 'washing_finished_by_student':
      // Для админа: студент закончил стирать
      if (ui_language === "en") {
        return `✅ *STUDENT FINISHED WASHING!*

👤 ${full_name}${roomInfo}
✅ Pressed "Finished washing"

🔑 Tap "Return key" to call them`;
      }
      if (ui_language === "ko") {
        return `✅ *학생이 세탁을 끝냈습니다!*

👤 ${full_name}${roomInfo}
✅ "세탁 완료"를 눌렀습니다

🔑 "열쇠 반납"을 눌러 호출하세요`;
      }
      if (ui_language === "ky") {
        return `✅ *СТУДЕНТ ЖУУНУ БҮТТҮ!* 

👤 ${full_name}${roomInfo}
✅ "Жууду бүттүм" баскычын басты

🔑 "Ключту кайтар" баскычын басып чакырыңыз`;
      }
      return `✅ *СТУДЕНТ ЗАКОНЧИЛ СТИРАТЬ!*

👤 ${full_name}${roomInfo}
✅ Нажал кнопку "Закончил стирать"

🔑 Нажмите "Вернуть ключ" чтобы позвать его`;
    
    case 'washing_finished':
      // Для студента: стирка завершена
      if (ui_language === "en") {
        return `✅ *WASHING FINISHED!*

🎉 Great! You finished washing

🧺 Don’t forget to take your items and leave the laundry room clean

⏳ Wait until the admin calls you to return the key`;
      }
      if (ui_language === "ko") {
        return `✅ *세탁 완료!*

🎉 잘했어요! 세탁이 끝났습니다

🧺 물건을 챙기고 세탁실 정리를 해주세요

⏳ 관리자가 열쇠 반납을 요청할 때까지 기다려주세요`;
      }
      if (ui_language === "ky") {
        return `✅ *ЖУУ АЯКТАДЫ!*

🎉 Сонун! Жууну бүтүрдүңүз

🧺 Буюмдарыңызды алып, кир жуучу бөлмөнү таза калтырыңыз

⏳ Админ ключту кайтарууга чакырганча күтүңүз`;
      }
      return `✅ *СТИРКА ЗАВЕРШЕНА!*

🎉 Отлично! Вы закончили стирать

🧺 Не забудьте забрать свои вещи и оставить порядок за собой из прачечной

⏳ Ожидайте когда админ позовет вернуть ключ`;
    
    case 'return_key_reminder':
      if (ui_language === "en") {
        return `⚠️ *REMINDER!*

👤 ${full_name}${roomInfo}
🔑 Please return the key!

⏱️ Other students are waiting!`;
      }
      if (ui_language === "ko") {
        return `⚠️ *알림!*

👤 ${full_name}${roomInfo}
🔑 열쇠를 반납해주세요!

⏱️ 다른 학생들이 기다리고 있습니다!`;
      }
      if (ui_language === "ky") {
        return `⚠️ *ЭСКЕРТҮҮ!*

👤 ${full_name}${roomInfo}
🔑 Сураныч, ключту кайтарыңыз!

⏱️ Башка студенттер күтүп жатышат!`;
      }
      return `⚠️ *НАПОМИНАНИЕ!*

👤 ${full_name}${roomInfo}
🔑 Пожалуйста, верните ключ!

⏱️ Другие студенты ждут своей очереди!`;
    
    default:
      if (ui_language === "en") return `📋 Queue update`;
      if (ui_language === "ko") return `📋 대기열 업데이트`;
      if (ui_language === "ky") return `📋 Кезек жаңыртылды`;
      return `📋 Обновление очереди`;
  }
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  console.log('🚀 sendTelegramMessage called:', { chatId, messageLength: message.length });
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('❌ No TELEGRAM_BOT_TOKEN');
    return false;
  }

  try {
    console.log('📡 Sending to Telegram API:', { chatId, botToken: TELEGRAM_BOT_TOKEN?.substring(0, 10) + '...' });
    
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
    console.log('📩 Telegram API response:', { ok: data.ok, chat_id: chatId, message_id: data.result?.message_id });
    
    if (!data.ok) {
      console.log('❌ Telegram API error:', data);
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
      .maybeSingle();
    
    if (callerError || !caller || caller.is_banned) {
      console.log('❌ User not found or is banned:', { caller, error: callerError?.message });
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const isAdmin = !!caller.is_admin || !!caller.is_super_admin;
    
    // ✅ Типы уведомлений, которые студенты могут отправлять админам
    const STUDENT_TO_ADMIN_TYPES = ['joined', 'left', 'washing_started_by_student', 'washing_finished_by_student'];
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
        .maybeSingle();

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
    let success = false;

    // ✅ Четкая логика маршрутизации уведомлений
    // 1. Уведомления для ВСЕХ админов (общие события очереди)
    const allAdminsNotifications = ['joined', 'left', 'washing_started_by_student', 'washing_finished_by_student', 'washing_done'];
    const isAllAdmins = allAdminsNotifications.includes(notification.type);
    
    // 2. Уведомления для КОНКРЕТНОГО студента (админские действия)
    const studentNotifications = ['admin_call_for_key', 'admin_key_issued', 'admin_return_key', 'washing_started', 'washing_finished', 'washing_done', 'return_key_reminder'];
    const isForStudent = studentNotifications.includes(notification.type);
    
    console.log('🎯 Notification routing:', { 
      type: notification.type,
      isAllAdmins,
      isForStudent,
      student_id: notification.student_id,
      admin_student_id: notification.admin_student_id
    });

    // ✅ Отправить ВСЕМ админам (только для общих событий очереди)
    if (isAllAdmins) {
      const adminRecipients = await getAllAdminRecipients();
      const adminChatIds = adminRecipients.map((r) => r.telegram_chat_id);
      console.log('📤 Sending to ALL admins from DB:', adminRecipients.length);

      for (const recipient of adminRecipients) {
        const adminMessage = await formatMessage(notification, "ru", true);
        const adminSuccess = await sendTelegramMessage(recipient.telegram_chat_id, adminMessage);
        if (adminSuccess) console.log('✅ Sent to admin:', recipient.telegram_chat_id);
        success = success || adminSuccess;
      }
      
      // Также отправить главному админу (если указан в .env и не в списке админов БД)
      if (TELEGRAM_ADMIN_CHAT_ID) {
        if (!adminChatIds.includes(TELEGRAM_ADMIN_CHAT_ID)) {
          console.log('📤 Sending to main admin from .env:', TELEGRAM_ADMIN_CHAT_ID);
          const mainAdminMessage = await formatMessage(notification, "ru", true);
          const mainAdminSuccess = await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, mainAdminMessage);
          if (mainAdminSuccess) console.log('✅ Sent to main admin');
          success = success || mainAdminSuccess;
        } else {
          console.log('ℹ️ Main admin already in DB admins list');
        }
      } else {
        console.log('⚠️ TELEGRAM_ADMIN_CHAT_ID not set in .env');
      }
    }
    
    // ✅ Отправить студенту (админские действия и статусы)
    if (isForStudent && notification.student_id) {
      console.log('👤 Sending notification to student:', notification.student_id);

      const studentRecipient = await getStudentRecipient(notification.student_id);

      if (studentRecipient) {
        const studentMessage = await formatMessage(notification, studentRecipient.ui_language, false);
        console.log('📤 About to send to student chat_id:', studentRecipient.telegram_chat_id);
        const studentSuccess = await sendTelegramMessage(studentRecipient.telegram_chat_id, studentMessage);
        console.log('📥 Send result to student:', { studentSuccess, chatId: studentRecipient.telegram_chat_id });
        if (studentSuccess) console.log('✅ Sent to student:', studentRecipient.telegram_chat_id);
        success = success || studentSuccess;
      } else {
        console.log('⚠️ Student has no telegram chat_id');
      }
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

// Telegram Bot API для отправки уведомлений
// ✅ Теперь все уведомления идут через безопасный API route
// Все секретные данные (токен бота, chat_id) хранятся на сервере
import { TelegramNotification } from '../types/index';

/**
 * Отправка Telegram уведомления через безопасный API route
 * Все секретные данные (токен бота, chat_id) хранятся на сервере
 */
export async function sendTelegramNotification(notification: TelegramNotification): Promise<boolean> {
  try {
    console.log('📤 [CLIENT] Sending Telegram notification:', {
      type: notification.type,
      full_name: notification.full_name,
      student_id: notification.student_id,
      admin_student_id: notification.admin_student_id
    });
    
    // Получить JWT токен из Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.error('❌ [CLIENT] No session token available');
      return false;
    }
    
    const response = await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(notification)
    });

    const result = await response.json();
    
    console.log('📥 [CLIENT] Telegram notification response:', {
      ok: response.ok,
      status: response.status,
      result
    });
    
    if (!response.ok) {
      console.error('❌ [CLIENT] Telegram notification failed:', result);
      return false;
    }

    return result.success || false;
  } catch (error) {
    console.error('❌ [CLIENT] Telegram notification error:', error);
    return false;
  }
}

/**
 * Отправка тестового уведомления
 */
export async function sendTestNotification(adminStudentId?: string): Promise<boolean> {
  return sendTelegramNotification({
    type: 'joined',
    full_name: 'Test User',
    room: 'A501',
    wash_count: 1,
    payment_type: 'money',
    queue_length: 1,
    admin_student_id: adminStudentId
  });
}

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
    console.log('📤 Sending Telegram notification:', notification.type);
    
    const response = await fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Telegram notification failed:', result.error);
      return false;
    }

    console.log('✅ Telegram notification sent successfully');
    return result.success || false;
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error);
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

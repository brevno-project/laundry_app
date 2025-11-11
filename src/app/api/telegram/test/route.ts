import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/telegram';

export async function POST() {
  try {
    const success = await sendTestNotification();
    return NextResponse.json({ 
      success, 
      message: success ? 'Уведомление отправлено' : 'Ошибка отправки' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
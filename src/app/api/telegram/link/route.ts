import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

/**
 * API route для подключения Telegram к студенту
 * Использует service_role key для обхода RLS
 * Защищен секретным заголовком X-Telegram-Secret
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Защита: проверяем секретный заголовок
    const secret = request.headers.get('x-telegram-secret');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('❌ TELEGRAM_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Парсим данные
    const { student_id, telegram_chat_id } = await request.json();

    if (!student_id || !telegram_chat_id) {
      return NextResponse.json(
        { error: 'Не указаны все данные' },
        { status: 400 }
      );
    }

    // ✅ Используем service_role клиент (обходит RLS)
    const { data: currentData } = await admin
      .from('students')
      .select('id, full_name, telegram_chat_id')
      .eq('id', student_id)
      .single();

    if (!currentData) {
      console.error('❌ Student not found:', student_id);
      return NextResponse.json(
        { error: 'Студент не найден' },
        { status: 404 }
      );
    }
    
    // Обновляем telegram_chat_id
    const { data, error } = await admin
      .from('students')
      .update({ telegram_chat_id: telegram_chat_id })
      .eq('id', student_id)
      .select('id, full_name, telegram_chat_id')
      .single();

    if (error) {
      console.error('❌ Database update error:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления базы данных: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: `Telegram успешно подключен для ${data.full_name}` 
    });
  } catch (error: any) {
    console.error('❌ Internal server error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

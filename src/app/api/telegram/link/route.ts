import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { studentId, telegramChatId } = await request.json();
    
    console.log('📥 /api/telegram/link request:', { studentId, telegramChatId });

    if (!studentId || !telegramChatId) {
      console.error('❌ Missing data:', { studentId, telegramChatId });
      return NextResponse.json(
        { error: 'Не указаны все данные' },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase not configured');
      return NextResponse.json(
        { error: 'База данных не настроена' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Проверить текущее значение
    const { data: currentData } = await supabase
      .from('students')
      .select('id, fullName, telegram_chat_id')
      .eq('id', studentId)
      .single();
    
    console.log('📊 BEFORE UPDATE:', currentData);

    // Обновить telegram_chat_id в таблице students
    console.log('🔄 Updating telegram_chat_id for studentId:', studentId, 'NEW VALUE:', telegramChatId);
    const { data, error } = await supabase
      .from('students')
      .update({ telegram_chat_id: telegramChatId })
      .eq('id', studentId)
      .select('id, fullName, telegram_chat_id');

    if (error) {
      console.error('❌ Error updating telegram_chat_id:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления базы данных: ' + error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ AFTER UPDATE:', data);
    
    if (!data || data.length === 0) {
      console.error('⚠️ UPDATE returned empty array - studentId not found!');
      return NextResponse.json(
        { error: 'Студент не найден в базе' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error in /api/telegram/link:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

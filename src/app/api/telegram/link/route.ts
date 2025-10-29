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

    // Обновить telegram_chat_id в таблице students
    console.log('🔄 Updating telegram_chat_id for studentId:', studentId);
    const { data, error } = await supabase
      .from('students')
      .update({ telegram_chat_id: telegramChatId })
      .eq('id', studentId)
      .select();

    if (error) {
      console.error('❌ Error updating telegram_chat_id:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления базы данных: ' + error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Successfully updated telegram_chat_id:', data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error in /api/telegram/link:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

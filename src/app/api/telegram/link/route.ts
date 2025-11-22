import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { student_id, telegram_chat_id } = await request.json();
    
    console.log('📥 /api/telegram/link request:', { student_id, telegram_chat_id });

    if (!student_id || !telegram_chat_id) {
      console.error('❌ Missing data:', { student_id, telegram_chat_id });
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
      .select('id, full_name, telegram_chat_id')
      .eq('id', student_id)
      .single();
    
    console.log('📊 BEFORE UPDATE:', currentData);

    // Обновить telegram_chat_id в таблице students
    console.log('🔄 Updating telegram_chat_id for student_id:', student_id, 'NEW VALUE:', telegram_chat_id);
    const { data, error } = await supabase
      .from('students')
      .update({ telegram_chat_id: telegram_chat_id })
      .eq('id', student_id)
      .select('id, full_name, telegram_chat_id');

    if (error) {
      console.error('❌ Error updating telegram_chat_id:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Проверяем есть ли проблема с RLS
      if (error.message?.includes('policy') || error.code === '42501') {
        return NextResponse.json(
          { error: 'Ошибка прав доступа. Проверьте RLS политики в Supabase.' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Ошибка обновления базы данных: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ telegram_chat_id UPDATED:', data);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Unexpected error in /api/telegram/link:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

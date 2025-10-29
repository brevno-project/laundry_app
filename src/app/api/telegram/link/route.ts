import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { studentId, telegramChatId } = await request.json();

    if (!studentId || !telegramChatId) {
      return NextResponse.json(
        { error: 'Missing studentId or telegramChatId' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Проверить что этот telegramChatId не используется другим студентом
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, fullName')
      .eq('telegram_chat_id', telegramChatId)
      .single();

    if (existingStudent && existingStudent.id !== studentId) {
      return NextResponse.json(
        { error: `Этот Telegram уже привязан к студенту: ${existingStudent.fullName}` },
        { status: 409 }
      );
    }

    // Привязать telegramChatId к студенту
    const { error } = await supabase
      .from('students')
      .update({ telegram_chat_id: telegramChatId })
      .eq('id', studentId);

    if (error) {
      console.error('Error linking Telegram:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/telegram/link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

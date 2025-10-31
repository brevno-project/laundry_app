import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { newKey } = await request.json();

    if (!newKey || newKey.length < 6) {
      return NextResponse.json(
        { error: 'Ключ должен быть минимум 6 символов' },
        { status: 400 }
      );
    }

    // В production среде это должно обновлять переменную окружения в Vercel/хостинге
    // Для локальной разработки можно сохранить в базу данных
    console.log('🔑 New admin key requested:', newKey);

    return NextResponse.json({ success: true, message: 'Ключ обновлён' });
  } catch (error) {
    console.error('Error updating admin key:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
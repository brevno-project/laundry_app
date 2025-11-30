import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // =============================
    // 1️⃣ Пришёл deep-link: /start <student_id>
    // =============================
    if (update.message && update.message.text.startsWith('/start ')) {
      const chatId = update.message.chat.id;
      const studentId = update.message.text.split(' ')[1];  // ID студента

      // Отправляем в API → обновить Supabase
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/telegram/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          telegram_chat_id: chatId
        })
      });

      // Готово — подтверждаем
      await sendTelegram({
        chat_id: chatId,
        text: `🎉 Telegram успешно подключён!\nТеперь вы будете получать уведомления.`,
      });

      return NextResponse.json({ ok: true });
    }

    // =============================
    // 2️⃣ Обычный /start без payload
    // =============================
    if (update.message && update.message.text === '/start') {
      const chatId = update.message.chat.id;

      await sendTelegram({
        chat_id: chatId,
        text:
          `👋 Чтобы подключить Telegram — откройте сайт Keiin Laundry и нажмите кнопку "Подключить Telegram".`
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


// ======== HELPERS ========

async function sendTelegram(body: any) {
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

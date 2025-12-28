import { NextRequest, NextResponse } from 'next/server';

// ✅ Проверка наличия переменных окружения
if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
  console.error("❌ Missing TELEGRAM_WEBHOOK_SECRET env");
}
if (!process.env.NEXT_PUBLIC_BASE_URL) {
  console.error("❌ Missing NEXT_PUBLIC_BASE_URL env");
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // =============================
    // 1️⃣ Пришёл deep-link: /start <student_id>
    // =============================
    if (update.message && update.message.text.startsWith('/start ')) {
      const chatId = update.message.chat.id;
      const studentId = update.message.text.split(' ')[1];  // ID студента

      console.log('🔔 Webhook received /start command:', { studentId, chatId });

      // ✅ Отправляем в API с секретным заголовком
      const linkRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/telegram/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Secret": process.env.TELEGRAM_WEBHOOK_SECRET || "", // ✅ ДОБАВИЛИ
        },
        body: JSON.stringify({
          student_id: studentId,
          telegram_chat_id: String(chatId), // ✅ Преобразуем в строку
        }),
      });

      // ✅ Проверяем результат
      if (!linkRes.ok) {
        const errText = await linkRes.text().catch(() => "");
        console.error("❌ Telegram link failed:", linkRes.status, errText);

        await sendTelegram({
          chat_id: chatId,
          text: `❌ Не удалось подключить Telegram (ошибка сервера). Попробуйте ещё раз или напишите администратору.`,
        });

        return NextResponse.json({ ok: false, error: "link_failed" }, { status: 500 });
      }

      const linkJson = await linkRes.json().catch(() => null);
      console.log("✅ Telegram linked successfully:", linkJson);

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

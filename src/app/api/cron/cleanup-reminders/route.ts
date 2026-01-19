import { NextRequest, NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { admin } from "@/lib/supabase-admin";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIMEZONE = "Asia/Bishkek";

const formatDateLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const formatTimeLabel = (timeStr?: string | null) => {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
};

async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    const data = await response.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

async function getBlockRecipients(block: string) {
  const { data: apartments } = await admin
    .from("apartments")
    .select("id, code")
    .eq("block", block);

  const apartmentIds = (apartments || []).map((apt) => apt.id);
  const apartmentCodes = (apartments || []).map((apt) => apt.code).filter(Boolean);
  const residentsMap = new Map<string, { telegram_chat_id: string | null; is_banned?: boolean | null }>();

  if (apartmentIds.length > 0) {
    const { data: byApartment } = await admin
      .from("students")
      .select("id, telegram_chat_id, is_banned")
      .in("apartment_id", apartmentIds);

    (byApartment || []).forEach((student: any) => {
      residentsMap.set(student.id, student);
    });
  }

  if (apartmentCodes.length > 0) {
    const { data: byRoom } = await admin
      .from("students")
      .select("id, telegram_chat_id, is_banned")
      .in("room", apartmentCodes);

    (byRoom || []).forEach((student: any) => {
      if (!residentsMap.has(student.id)) {
        residentsMap.set(student.id, student);
      }
    });
  } else {
    const { data: byRoomPrefix } = await admin
      .from("students")
      .select("id, telegram_chat_id, is_banned")
      .ilike("room", `${block}%`);

    (byRoomPrefix || []).forEach((student: any) => {
      if (!residentsMap.has(student.id)) {
        residentsMap.set(student.id, student);
      }
    });
  }

  return Array.from(residentsMap.values())
    .filter((student) => !student.is_banned)
    .map((student) => student.telegram_chat_id)
    .filter((chatId): chatId is string => !!chatId);
}

export async function GET(req: NextRequest) {
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const secretFromQuery = req.nextUrl.searchParams.get("secret");

  if (!isCron && (!secret || authHeader !== `Bearer ${secret}`) && secretFromQuery !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram bot token missing" }, { status: 500 });
  }

  const now = new Date();
  const today = formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
  const nowTime = formatInTimeZone(now, TIMEZONE, "HH:mm");

  const { data: schedules, error } = await admin
    .from("cleanup_schedules")
    .select("block, check_date, check_time, reminder_time")
    .eq("check_date", today)
    .eq("reminder_time", nowTime)
    .is("reminder_sent_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = schedules || [];
  let totalSent = 0;

  for (const schedule of list) {
    const dateLabel = formatDateLabel(schedule.check_date);
    const timeLabel = formatTimeLabel(schedule.check_time);
    const timeText = timeLabel ? `, ${timeLabel}` : "";
    const message = `Напоминание: сегодня проверка блока ${schedule.block}\n${dateLabel}${timeText}.`;

    const recipients = await getBlockRecipients(schedule.block);
    for (const chatId of recipients) {
      const ok = await sendTelegramMessage(chatId, message);
      if (ok) totalSent += 1;
    }
  }

  if (list.length > 0) {
    await admin
      .from("cleanup_schedules")
      .update({ reminder_sent_at: new Date().toISOString() })
      .in(
        "block",
        list.map((schedule) => schedule.block)
      );
  }

  return NextResponse.json({ success: true, schedules: list.length, sent: totalSent });
}


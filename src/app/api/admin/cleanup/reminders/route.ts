import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
  const { data: apartments } = await supabaseAdmin
    .from("apartments")
    .select("id, code")
    .eq("block", block);

  const apartmentIds = (apartments || []).map((apt) => apt.id);
  const apartmentCodes = (apartments || []).map((apt) => apt.code).filter(Boolean);
  const residentsMap = new Map<string, { telegram_chat_id: string | null; is_banned?: boolean | null }>();

  if (apartmentIds.length > 0) {
    const { data: byApartment } = await supabaseAdmin
      .from("students")
      .select("id, telegram_chat_id, is_banned")
      .in("apartment_id", apartmentIds);

    (byApartment || []).forEach((student: any) => {
      residentsMap.set(student.id, student);
    });
  }

  if (apartmentCodes.length > 0) {
    const { data: byRoom } = await supabaseAdmin
      .from("students")
      .select("id, telegram_chat_id, is_banned")
      .in("room", apartmentCodes);

    (byRoom || []).forEach((student: any) => {
      if (!residentsMap.has(student.id)) {
        residentsMap.set(student.id, student);
      }
    });
  } else {
    const { data: byRoomPrefix } = await supabaseAdmin
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

export async function POST(req: NextRequest) {
  try {
    const { caller, error: authError } = await getCaller(req);
    if (authError) return authError;

    const { block } = await req.json();

    if (!block) {
      return NextResponse.json({ error: "Missing block" }, { status: 400 });
    }

    if (block !== "A" && block !== "B") {
      return NextResponse.json({ error: "Invalid block" }, { status: 400 });
    }

    if (!caller.is_super_admin) {
      const { data: adminStudent } = await supabaseAdmin
        .from("students")
        .select("apartment_id")
        .eq("id", caller.student_id)
        .maybeSingle();

      if (!adminStudent?.apartment_id) {
        return NextResponse.json({ error: "Admin apartment not set" }, { status: 403 });
      }

      const { data: adminApartment } = await supabaseAdmin
        .from("apartments")
        .select("block")
        .eq("id", adminStudent.apartment_id)
        .maybeSingle();

      if (!adminApartment?.block || adminApartment.block !== block) {
        return NextResponse.json(
          { error: "Not allowed to send reminders for this block" },
          { status: 403 }
        );
      }
    }

    const { data: schedule } = await supabaseAdmin
      .from("cleanup_schedules")
      .select("block, check_date, check_time, reminder_time")
      .eq("block", block)
      .maybeSingle();

    if (!schedule?.check_date) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const dateLabel = formatDateLabel(schedule.check_date);
    const timeLabel = formatTimeLabel(schedule.check_time);
    const timeText = timeLabel ? `, ${timeLabel}` : "";
    const message = `Напоминание: проверка блока ${schedule.block} - ${dateLabel}${timeText}.`;

    const recipients = await getBlockRecipients(schedule.block);
    let totalSent = 0;

    if (TELEGRAM_BOT_TOKEN && recipients.length > 0) {
      for (const chatId of recipients) {
        const ok = await sendTelegramMessage(chatId, message);
        if (ok) totalSent += 1;
      }
    }

    await supabaseAdmin
      .from("cleanup_schedules")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("block", schedule.block);

    return NextResponse.json({
      success: true,
      sent: totalSent,
    });
  } catch (err: any) {
    console.error("Error in cleanup reminders:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

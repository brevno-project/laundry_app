import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type Recipient = {
  id: string;
  name: string;
  room: string | null;
  telegram_chat_id: string | null;
  is_banned?: boolean | null;
};

const formatDateLabel = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const formatTimeLabel = (timeStr?: string | null) => {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
};

const formatStudentName = (student: any) => {
  const fullName = (student.full_name || "").trim();
  if (fullName) return fullName;
  const parts = [student.first_name, student.last_name, student.middle_name]
    .filter(Boolean)
    .map((value: string) => value.trim());
  if (parts.length > 0) return parts.join(" ");
  return "Без имени";
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

  const typedApartments = (apartments as { id: string; code: string | null }[] | null | undefined) || [];
  const apartmentIds = typedApartments.map((apt: { id: string; code: string | null }) => apt.id);
  const apartmentCodes = typedApartments
    .map((apt: { id: string; code: string | null }) => apt.code)
    .filter(Boolean);
  const residentsMap = new Map<string, Recipient>();

  const selectFields = "id, telegram_chat_id, is_banned, full_name, first_name, last_name, middle_name, room";

  if (apartmentIds.length > 0) {
    const { data: byApartment } = await supabaseAdmin
      .from("students")
      .select(selectFields)
      .in("apartment_id", apartmentIds);

    (byApartment || []).forEach((student: any) => {
      residentsMap.set(student.id, {
        id: student.id,
        name: formatStudentName(student),
        room: student.room || null,
        telegram_chat_id: student.telegram_chat_id || null,
        is_banned: student.is_banned,
      });
    });
  }

  if (apartmentCodes.length > 0) {
    const { data: byRoom } = await supabaseAdmin
      .from("students")
      .select(selectFields)
      .in("room", apartmentCodes);

    (byRoom || []).forEach((student: any) => {
      if (!residentsMap.has(student.id)) {
        residentsMap.set(student.id, {
          id: student.id,
          name: formatStudentName(student),
          room: student.room || null,
          telegram_chat_id: student.telegram_chat_id || null,
          is_banned: student.is_banned,
        });
      }
    });
  } else {
    const { data: byRoomPrefix } = await supabaseAdmin
      .from("students")
      .select(selectFields)
      .ilike("room", `${block}%`);

    (byRoomPrefix || []).forEach((student: any) => {
      if (!residentsMap.has(student.id)) {
        residentsMap.set(student.id, {
          id: student.id,
          name: formatStudentName(student),
          room: student.room || null,
          telegram_chat_id: student.telegram_chat_id || null,
          is_banned: student.is_banned,
        });
      }
    });
  }

  return Array.from(residentsMap.values()).filter(
    (student) => !student.is_banned && student.telegram_chat_id
  );
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
        .select("apartment_id, room")
        .eq("id", caller.student_id)
        .maybeSingle();

      let adminBlock: string | null = null;

      if (adminStudent?.apartment_id) {
        const { data: adminApartment } = await supabaseAdmin
          .from("apartments")
          .select("block")
          .eq("id", adminStudent.apartment_id)
          .maybeSingle();

        if (adminApartment?.block) {
          adminBlock = adminApartment.block;
        }
      }

      if (!adminBlock && adminStudent?.room) {
        const roomBlock = adminStudent.room.trim().charAt(0).toUpperCase();
        if (roomBlock === "A" || roomBlock === "B") {
          adminBlock = roomBlock;
        }
      }

      if (!adminBlock) {
        return NextResponse.json(
          { error: "У администратора не указан блок" },
          { status: 403 }
        );
      }

      if (adminBlock !== block) {
        return NextResponse.json(
          { error: "Not allowed to send reminders for this block" },
          { status: 403 }
        );
      }
    }

    const { data: schedule } = await supabaseAdmin
      .from("cleanup_schedules")
      .select("block, check_date, check_time")
      .eq("block", block)
      .maybeSingle();

    if (!schedule?.check_date) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const dateLabel = formatDateLabel(schedule.check_date);
    const timeLabel = formatTimeLabel(schedule.check_time);
    const timeText = timeLabel ? `, ${timeLabel}` : "";
    const message = `Напоминание: проверка блока ${schedule.block}\n${dateLabel}${timeText}.`;

    const recipients = await getBlockRecipients(schedule.block);
    const sentTo: Recipient[] = [];
    const failedTo: Recipient[] = [];

    if (TELEGRAM_BOT_TOKEN && recipients.length > 0) {
      for (const recipient of recipients) {
        const ok = await sendTelegramMessage(recipient.telegram_chat_id as string, message);
        if (ok) {
          sentTo.push(recipient);
        } else {
          failedTo.push(recipient);
        }
      }
    }

    await supabaseAdmin
      .from("cleanup_schedules")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("block", schedule.block);

    return NextResponse.json({
      success: true,
      sent: sentTo.length,
      attempted: recipients.length,
      sent_to: sentTo.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        room: recipient.room,
      })),
      failed_to: failedTo.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        room: recipient.room,
      })),
    });
  } catch (err: any) {
    console.error("Error in cleanup reminders:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

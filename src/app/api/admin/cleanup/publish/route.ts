import { NextRequest, NextResponse } from "next/server";
import { getCaller, supabaseAdmin } from "../../../_utils/adminAuth";

const DEFAULT_COUPON_TTL_SECONDS = 604800;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type UiLanguage = "ru" | "en" | "ko" | "ky";

type Recipient = {
  id: string;
  name: string;
  room?: string | null;
  telegram_chat_id: string | null;
  is_banned?: boolean | null;
  ui_language?: UiLanguage;
};

const normalizeUiLanguage = (value: unknown): UiLanguage => {
  if (value === "ru" || value === "en" || value === "ko" || value === "ky") return value;
  return "ru";
};

const formatDateLabel = (dateStr: string, language: UiLanguage) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const locale =
    language === "en" ? "en-US" : language === "ko" ? "ko-KR" : language === "ky" ? "ky-KG" : "ru-RU";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long" });
};

const formatStudentName = (student: any) => {
  const fullName = (student.full_name || "").trim();
  if (fullName) return fullName;
  const parts = [student.first_name, student.last_name, student.middle_name]
    .filter(Boolean)
    .map((value: string) => value.trim());
  if (parts.length > 0) return parts.join(" ");
  return "";
};

const MAX_TELEGRAM_CHARS = 3800;

const formatPublishMessage = ({
  block,
  dateLabel,
  winnerLabel,
  announcement,
  language,
}: {
  block: string;
  dateLabel: string;
  winnerLabel: string;
  announcement: string;
  language: UiLanguage;
}) => {
  const announcementBody = announcement || "";
  const normalizeAnnouncement = (fallback: string) => {
    const base = announcementBody.trim() || fallback;
    return base;
  };
  const buildMessage = (headerLines: string[], fallbackAnnouncement: string) => {
    const base = `${headerLines.join("\n")}\n`;
    const body = normalizeAnnouncement(fallbackAnnouncement);
    const maxBody = MAX_TELEGRAM_CHARS - base.length;
    if (maxBody <= 0) {
      return base.slice(0, MAX_TELEGRAM_CHARS - 1) + "…";
    }
    if (body.length > maxBody) {
      const trimmed = body.slice(0, Math.max(0, maxBody - 1)).trimEnd();
      return `${base}${trimmed}…`;
    }
    return `${base}${body}`;
  };
  if (language === "en") {
    return buildMessage(
      [
        `🧹 Cleanup results for block ${block}`,
        `Date: ${dateLabel}`,
        `Winner: ${winnerLabel}`,
        "",
      ],
      "Results are published."
    );
  }
  if (language === "ko") {
    return buildMessage(
      [
        `🧹 ${block} 블록 청소 결과`,
        `날짜: ${dateLabel}`,
        `우승 아파트: ${winnerLabel}`,
        "",
      ],
      "결과가 게시되었습니다."
    );
  }
  if (language === "ky") {
    return buildMessage(
      [
        `🧹 ${block} блогунун тазалык жыйынтыгы`,
        `Күнү: ${dateLabel}`,
        `Жеңүүчү: ${winnerLabel}`,
        "",
      ],
      "Жыйынтык жарыяланды."
    );
  }
  return buildMessage(
    [
      `🧹 Итоги уборки блока ${block}`,
      `Дата: ${dateLabel}`,
      `Победитель: ${winnerLabel}`,
      "",
    ],
    "Результаты опубликованы."
  );
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

  const selectFields = "id, telegram_chat_id, is_banned, room, full_name, first_name, last_name, middle_name, ui_language";

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
        ui_language: normalizeUiLanguage(student.ui_language),
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
          ui_language: normalizeUiLanguage(student.ui_language),
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
          ui_language: normalizeUiLanguage(student.ui_language),
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

    const {
      week_start,
      block,
      apartment_id,
      announcement_text,
      announcement_mode,
      template_key,
    } = await req.json();

    if (!week_start || !block || !apartment_id || !announcement_text) {
      return NextResponse.json(
        { error: "Заполните все обязательные поля" },
        { status: 400 }
      );
    }

    if (block !== "A" && block !== "B") {
      return NextResponse.json({ error: "Некорректный блок" }, { status: 400 });
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
          { error: "Нельзя публиковать результаты для этого блока" },
          { status: 403 }
        );
      }
    }

    const { data: winningApartment } = await supabaseAdmin
      .from("apartments")
      .select("id, block, code")
      .eq("id", apartment_id)
      .maybeSingle();

    if (!winningApartment) {
      return NextResponse.json({ error: "Квартира не найдена" }, { status: 404 });
    }

    if (winningApartment.block && winningApartment.block !== block) {
      return NextResponse.json(
        { error: "Квартира не относится к выбранному блоку" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("cleanup_results")
      .select("id")
      .eq("week_start", week_start)
      .eq("block", block)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Результаты уже опубликованы" },
        { status: 409 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const { data: ttlSetting } = await supabaseAdmin
      .from("app_settings")
      .select("value_int")
      .eq("key", "cleanup_coupon_ttl_seconds")
      .maybeSingle();

    const ttlSeconds =
      typeof ttlSetting?.value_int === "number"
        ? ttlSetting.value_int
        : DEFAULT_COUPON_TTL_SECONDS;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const { data: result, error: insertError } = await supabaseAdmin
      .from("cleanup_results")
      .insert({
        week_start,
        block,
        winning_apartment_id: apartment_id,
        announcement_text,
        announcement_mode: announcement_mode || "template",
        template_key: template_key || null,
        announced_by: caller.student_id,
        created_by: caller.student_id,
        published_at: nowIso,
        coupons_issued_at: nowIso,
      })
      .select("id")
      .single();

    if (insertError || !result) {
      return NextResponse.json(
        { error: "Не удалось сохранить результаты" },
        { status: 500 }
      );
    }

    const { data: residentsByApartment, error: residentsByApartmentError } = await supabaseAdmin
      .from("students")
      .select("id, is_banned")
      .eq("apartment_id", apartment_id);

    if (residentsByApartmentError) {
      return NextResponse.json(
        { error: "Не удалось получить жителей квартиры" },
        { status: 500 }
      );
    }

    let residentsByRoom: { id: string; is_banned?: boolean | null }[] = [];
    if (winningApartment.code) {
      const { data: residentsByRoomData, error: residentsByRoomError } = await supabaseAdmin
        .from("students")
        .select("id, is_banned")
        .eq("room", winningApartment.code);

      if (residentsByRoomError) {
        return NextResponse.json(
          { error: "Не удалось получить жителей по комнате" },
          { status: 500 }
        );
      }
      residentsByRoom = residentsByRoomData || [];
    }

    const residentsMap = new Map<string, { id: string; is_banned?: boolean | null }>();
    (residentsByApartment as { id: string; is_banned?: boolean | null }[] | null | undefined || []).forEach(
      (student: { id: string; is_banned?: boolean | null }) => {
      residentsMap.set(student.id, student);
      }
    );
    residentsByRoom.forEach((student: { id: string; is_banned?: boolean | null }) => {
      if (!residentsMap.has(student.id)) {
        residentsMap.set(student.id, student);
      }
    });

    const eligibleResidents = Array.from(residentsMap.values()).filter(
      (student) => !student.is_banned
    );

    if (eligibleResidents.length > 0) {
      const couponRows = eligibleResidents.map((student) => ({
        owner_student_id: student.id,
        source_type: "cleanup",
        source_id: result.id,
        issued_by: caller.student_id,
        issued_at: nowIso,
        valid_from: nowIso,
        expires_at: expiresAt,
      }));

      const { error: couponError } = await supabaseAdmin
        .from("coupons")
        .insert(couponRows);

      if (couponError) {
        await supabaseAdmin.from("cleanup_results").delete().eq("id", result.id);
        return NextResponse.json(
          { error: "Не удалось выдать купоны" },
          { status: 500 }
        );
      }
    }

    const announcementBody =
      typeof announcement_text === "string" ? announcement_text.trim() : "";

    const recipients = await getBlockRecipients(block);
    const sentTo: Recipient[] = [];
    const failedTo: Recipient[] = [];
    const skippedTo: Recipient[] = [];
    const telegramEnabled = !!TELEGRAM_BOT_TOKEN;

    if (telegramEnabled && recipients.length > 0) {
      for (const recipient of recipients) {
        const language = recipient.ui_language || "ru";
        const dateLabel = formatDateLabel(week_start, language);
        const message = formatPublishMessage({
          block,
          dateLabel,
          winnerLabel: winningApartment.code || "—",
          announcement: announcementBody,
          language,
        });

        const ok = await sendTelegramMessage(recipient.telegram_chat_id as string, message);
        if (ok) {
          sentTo.push(recipient);
        } else {
          failedTo.push(recipient);
        }
      }
    } else if (!telegramEnabled && recipients.length > 0) {
      skippedTo.push(...recipients);
    }

    return NextResponse.json({
      success: true,
      result_id: result.id,
      coupons_issued: eligibleResidents.length,
      expires_at: expiresAt,
      telegram_enabled: telegramEnabled,
      sent: sentTo.length,
      attempted: telegramEnabled ? recipients.length : 0,
      recipients_total: recipients.length,
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
      skipped_to: skippedTo.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        room: recipient.room,
      })),
    });
  } catch (err: any) {
    console.error("Error in cleanup publish:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

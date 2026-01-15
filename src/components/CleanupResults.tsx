"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLaundry } from "@/contexts/LaundryContext";
import { supabase } from "@/lib/supabase";
import type {
  Apartment,
  CleanupResult,
  CleanupSchedule,
  Coupon,
  CouponTransfer,
  Student,
} from "@/types";
import {
  CalendarIcon,
  CheckIcon,
  MoneyIcon,
  PeopleIcon,
  TicketIcon,
} from "@/components/Icons";

const SCORE_CAPTIONS = [
  {
    key: "thanks-team",
    label: "Спасибо всем за старание — вы большие молодцы!",
  },
  {
    key: "keep-going",
    label: "Так держать! На следующей неделе ждём ещё лучше.",
  },
  {
    key: "clean-and-cozy",
    label: "Было чисто и приятно — благодарим всех.",
  },
  {
    key: "great-teamwork",
    label: "Отличная работа команды, продолжайте в том же духе.",
  },
  {
    key: "super-result",
    label: "Супер-результат, спасибо за порядок.",
  },
  {
    key: "everyone-contributed",
    label: "Каждая квартира внесла вклад — это заметно.",
  },
  {
    key: "top-clean",
    label: "Сегодня чистота на высоте, гордимся вами.",
  },
  {
    key: "excellent",
    label: "Уборка прошла на отлично, спасибо!",
  },
  {
    key: "thanks-participation",
    label: "Всем спасибо за участие и аккуратность.",
  },
  {
    key: "clean-is-ours",
    label: "Чистота — наше всё. Хороший результат!",
  },
  {
    key: "together-strong",
    label: "Дружно поработали — молодцы!",
  },
  {
    key: "responsibility",
    label: "Спасибо за ответственность и дисциплину.",
  },
  {
    key: "keep-bar",
    label: "Продолжайте держать планку.",
  },
  {
    key: "order-pleases",
    label: "Порядок радует глаз — благодарим!",
  },
  {
    key: "week-results",
    label: "Отличные итоги недели, так держать!",
  },
];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextWednesdayISO = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const targetDay = 3;
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return formatLocalDate(next);
};

const formatWeekLabel = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
};

const formatScheduleLabel = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTime = (timeStr?: string | null) => {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
};

const formatPoints = (value: number) => {
  const abs = Math.abs(value);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${value} балл`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} балла`;
  }
  return `${value} баллов`;
};

const hasCyrillic = (value: string) => /[А-Яа-яЁё]/.test(value);

const mapPublishError = (message?: string) => {
  if (!message) return "Ошибка публикации";
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return "Сессия устарела. Выйдите и войдите снова.";
    case "Missing required fields":
      return "Заполните все обязательные поля";
    case "Invalid block":
      return "Некорректный блок";
    case "Admin apartment not set":
      return "У администратора не указана квартира";
    case "Not allowed to publish for this block":
      return "Нельзя публиковать результаты для этого блока";
    case "Apartment not found":
      return "Квартира не найдена";
    case "Apartment block mismatch":
      return "Квартира не относится к выбранному блоку";
    case "Insert failed":
      return "Не удалось сохранить результаты";
    default:
      return "Ошибка публикации";
  }
};

const mapScheduleError = (message?: string) => {
  if (!message) return "Ошибка расписания";
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return "Сессия устарела. Выйдите и войдите снова.";
    case "Missing required fields":
      return "Заполните дату проверки";
    case "Invalid block":
      return "Некорректный блок";
    case "Not allowed to schedule for this block":
      return "Нельзя менять расписание этого блока";
    case "Insert failed":
      return "Не удалось сохранить расписание";
    default:
      return "Ошибка расписания";
  }
};

const mapReminderError = (message?: string) => {
  if (!message) return "Ошибка отправки напоминаний";
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return "Сессия устарела. Выйдите и войдите снова.";
    case "Missing block":
      return "Не указан блок";
    case "Invalid block":
      return "Некорректный блок";
    case "Admin apartment not set":
      return "У администратора не указана квартира";
    case "Not allowed to send reminders for this block":
      return "Нельзя отправлять напоминания для этого блока";
    case "Schedule not found":
      return "Расписание не найдено";
    case "Internal server error":
      return "Внутренняя ошибка сервера";
    default:
      return "Ошибка отправки напоминаний";
  }
};

const mapResultsError = (message?: string) => {
  if (!message) return "Ошибка удаления публикаций";
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Invalid token":
    case "Missing or invalid Authorization header":
      return "Сессия устарела. Выйдите и войдите снова.";
    case "Missing block":
      return "Не указан блок";
    case "Invalid block":
      return "Некорректный блок";
    case "Admin apartment not set":
      return "У администратора не указана квартира";
    case "Not allowed to clear results for this block":
      return "Нельзя очищать публикации этого блока";
    default:
      return "Ошибка удаления публикаций";
  }
};

const mapTransferError = (message?: string) => {
  if (!message) return "Ошибка передачи";
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Coupon not found":
      return "Купон не найден";
    case "Coupon expired":
      return "Купон уже сгорел";
    case "Not allowed":
      return "Недостаточно прав для передачи";
    case "Coupon is reserved or used":
      return "Купон уже в очереди или использован";
    case "Different apartment":
      return "Передавать можно только внутри одной квартиры";
    default:
      return "Ошибка передачи";
  }
};

const mapGrantError = (message?: string) => {
  if (!message) return "Ошибка выдачи";
  if (hasCyrillic(message)) return message;
  switch (message) {
    case "Only super admin can grant coupons":
      return "Только суперадмин может выдавать купоны";
    case "Missing student_id or invalid count":
      return "Выберите студента и количество";
    case "Invalid expires_at":
      return "Некорректный срок купона";
    case "expires_at must be in the future":
      return "Срок купона должен быть в будущем";
    case "Internal server error":
      return "Внутренняя ошибка сервера";
    default:
      return "Ошибка выдачи";
  }
};

type CleanupResultsProps = {
  embedded?: boolean;
};

type Block = "A" | "B";

type ScheduleDraft = {
  date: string;
  time: string;
};

type ReminderRecipient = {
  id: string;
  name: string;
  room?: string | null;
};

const formatTtlLabel = (seconds: number) => {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} мин.`;
  }
  return `${seconds} сек.`;
};

const formatRecipientLabel = (recipient: ReminderRecipient) =>
  recipient.room ? `${recipient.name} (${recipient.room})` : recipient.name;

export default function CleanupResults({ embedded = false }: CleanupResultsProps) {
  const { user, isAdmin, isSuperAdmin } = useLaundry();
  const [results, setResults] = useState<CleanupResult[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [schedules, setSchedules] = useState<CleanupSchedule[]>([]);
  const [announcers, setAnnouncers] = useState<Record<string, string>>({});
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transfers, setTransfers] = useState<CouponTransfer[]>([]);
  const [transferNames, setTransferNames] = useState<Record<string, string>>({});
  const [recipients, setRecipients] = useState<Student[]>([]);
  const [adminBlock, setAdminBlock] = useState<Block | null>(null);
  const [weekStart, setWeekStart] = useState(getNextWednesdayISO());
  const [selectedBlock, setSelectedBlock] = useState<Block>("A");
  const [selectedApartment, setSelectedApartment] = useState<string>("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementMode, setAnnouncementMode] = useState("manual");
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [transferCouponId, setTransferCouponId] = useState("");
  const [transferRecipientId, setTransferRecipientId] = useState("");
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [transferHistoryNotice, setTransferHistoryNotice] = useState<string | null>(null);
  const [transferClearing, setTransferClearing] = useState(false);
  const [grantStudentId, setGrantStudentId] = useState("");
  const [grantCount, setGrantCount] = useState(1);
  const [grantNote, setGrantNote] = useState("");
  const [grantExpiryMode, setGrantExpiryMode] = useState<"default" | "custom" | "permanent">("default");
  const [grantExpiresAt, setGrantExpiresAt] = useState("");
  const [grantNotice, setGrantNotice] = useState<string | null>(null);
  const [grantStudents, setGrantStudents] = useState<Student[]>([]);
  const [couponTtlSeconds, setCouponTtlSeconds] = useState<number | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [scoreCaptionKey, setScoreCaptionKey] = useState(
    SCORE_CAPTIONS[0]?.key || ""
  );
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<Block, ScheduleDraft>>(() => ({
    A: { date: getNextWednesdayISO(), time: "19:00" },
    B: { date: getNextWednesdayISO(), time: "19:00" },
  }));
  const [scheduleNotice, setScheduleNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [scheduleSaving, setScheduleSaving] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [resultsClearing, setResultsClearing] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [resultsNotice, setResultsNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderNotice, setReminderNotice] = useState<Record<Block, string | null>>({
    A: null,
    B: null,
  });
  const [reminderSending, setReminderSending] = useState<Record<Block, boolean>>({
    A: false,
    B: false,
  });
  const [reminderRecipients, setReminderRecipients] = useState<
    Record<Block, ReminderRecipient[]>
  >({
    A: [],
    B: [],
  });
  const [reminderFailures, setReminderFailures] = useState<
    Record<Block, ReminderRecipient[]>
  >({
    A: [],
    B: [],
  });

  const getAuthToken = async (forceRefresh = false) => {
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    const expiresAt = session?.expires_at ? session.expires_at * 1000 : 0;
    if (!session?.access_token) return null;
    const shouldRefresh =
      forceRefresh || !expiresAt || expiresAt - Date.now() < 60 * 1000;
    if (shouldRefresh) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) {
        session = refreshed.session;
      }
    }
    return session?.access_token ?? null;
  };

  const authedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Не удалось получить токен.");
    }

    const buildOptions = (authToken: string): RequestInit => {
      const headers = new Headers(options.headers ?? {});
      headers.set("Authorization", `Bearer ${authToken}`);
      return { ...options, headers };
    };

    let response = await fetch(url, buildOptions(token));

    if (response.status === 401) {
      const refreshedToken = await getAuthToken(true);
      if (refreshedToken && refreshedToken !== token) {
        response = await fetch(url, buildOptions(refreshedToken));
      }
    }

    return response;
  };

  const apartmentMap = useMemo(() => {
    const map: Record<string, Apartment> = {};
    apartments.forEach((apt) => {
      map[apt.id] = apt;
    });
    return map;
  }, [apartments]);

  const resultsByBlock = useMemo(() => {
    return {
      A: results.filter((item) => item.block === "A"),
      B: results.filter((item) => item.block === "B"),
    };
  }, [results]);

  const schedulesByBlock = useMemo(() => {
    return schedules.reduce<Record<Block, CleanupSchedule>>((acc, schedule) => {
      acc[schedule.block] = schedule;
      return acc;
    }, {} as Record<Block, CleanupSchedule>);
  }, [schedules]);

  const apartmentsForBlock = useMemo(() => {
    return apartments.filter((apt) => !apt.block || apt.block === selectedBlock);
  }, [apartments, selectedBlock]);

  const selectedScoreCaption =
    SCORE_CAPTIONS.find((caption) => caption.key === scoreCaptionKey)?.label || "";

  const loadApartments = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("apartments")
      .select("id, code, block")
      .order("code", { ascending: true });
    setApartments((data as Apartment[]) || []);
  };

  const loadResults = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("cleanup_results")
      .select(
        "id, week_start, block, announcement_text, announcement_mode, template_key, announced_by, published_at, winning_apartment_id, created_at"
      )
      .order("week_start", { ascending: false })
      .order("created_at", { ascending: false });

    const rows = (data as CleanupResult[]) || [];
    setResults(rows);

    const announcerIds = Array.from(
      new Set(rows.map((row) => row.announced_by).filter(Boolean))
    ) as string[];

    if (announcerIds.length > 0) {
      const { data: announcerRows } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", announcerIds);

      const announcerMap: Record<string, string> = {};
      (announcerRows || []).forEach((student: any) => {
        announcerMap[student.id] = student.full_name;
      });
      setAnnouncers(announcerMap);
    }
  };

  const loadSchedules = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("cleanup_schedules")
      .select("block, check_date, check_time, set_by, updated_at, reminder_sent_at");

    setSchedules((data as CleanupSchedule[]) || []);
  };

  const loadAdminBlock = async () => {
    if (!supabase || !user?.student_id || !isAdmin) return;

    const { data: adminStudent } = await supabase
      .from("students")
      .select("apartment_id")
      .eq("id", user.student_id)
      .maybeSingle();

    if (!adminStudent?.apartment_id) {
      setAdminBlock(null);
      return;
    }

    const { data: adminApartment } = await supabase
      .from("apartments")
      .select("block")
      .eq("id", adminStudent.apartment_id)
      .maybeSingle();

    const block =
      adminApartment?.block === "A" || adminApartment?.block === "B"
        ? adminApartment.block
        : null;
    setAdminBlock(block);
    if (block) setSelectedBlock(block);
  };

  const loadCouponTtl = async () => {
    if (!supabase || (!isAdmin && !isSuperAdmin)) return;
    const { data } = await supabase
      .from("app_settings")
      .select("value_int")
      .eq("key", "cleanup_coupon_ttl_seconds")
      .maybeSingle();
    if (typeof data?.value_int === "number") {
      setCouponTtlSeconds(data.value_int);
    }
  };

  const loadCoupons = async () => {
    if (!supabase || !user?.student_id) return;
    const { data } = await supabase
      .from("coupons")
      .select(
        "id, owner_student_id, source_type, source_id, issued_by, issued_at, valid_from, expires_at, reserved_queue_id, reserved_at, used_in_queue_id, used_at, note"
      )
      .eq("owner_student_id", user.student_id)
      .order("issued_at", { ascending: false });

    setCoupons((data as Coupon[]) || []);
  };

  const loadTransfers = async () => {
    if (!supabase) return;
    let query = supabase
      .from("coupon_transfers")
      .select("id, coupon_id, from_student_id, to_student_id, performed_by, created_at, note");

    if (isAdmin || isSuperAdmin) {
      query = query.order("created_at", { ascending: false });
    } else if (user?.student_id) {
      query = query
        .or(`from_student_id.eq.${user.student_id},to_student_id.eq.${user.student_id}`)
        .order("created_at", { ascending: false });
    } else {
      setTransfers([]);
      return;
    }

    const { data } = await query;

    const rows = (data as CouponTransfer[]) || [];
    setTransfers(rows);

    const studentIds = Array.from(
      new Set(rows.flatMap((row) => [row.from_student_id, row.to_student_id]))
    );
    if (studentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", studentIds);

      const nameMap: Record<string, string> = {};
      (studentRows || []).forEach((student: any) => {
        nameMap[student.id] = student.full_name;
      });
      setTransferNames(nameMap);
    }
  };

  const loadRecipients = async () => {
    if (!supabase || !user?.student_id) return;
    const { data: currentStudent } = await supabase
      .from("students")
      .select("apartment_id, room")
      .eq("id", user.student_id)
      .maybeSingle();

    if (!currentStudent) {
      setRecipients([]);
      return;
    }

    const residentsMap = new Map<string, Student>();

    if (currentStudent.apartment_id) {
      const { data: rowsByApartment } = await supabase
        .from("students")
        .select("id, full_name, room, apartment_id")
        .eq("apartment_id", currentStudent.apartment_id)
        .neq("id", user.student_id);

      (rowsByApartment as Student[] || []).forEach((student) => {
        residentsMap.set(student.id, student);
      });
    }

    if (currentStudent.room) {
      const { data: rowsByRoom } = await supabase
        .from("students")
        .select("id, full_name, room, apartment_id")
        .eq("room", currentStudent.room)
        .neq("id", user.student_id);

      (rowsByRoom as Student[] || []).forEach((student) => {
        if (!residentsMap.has(student.id)) {
          residentsMap.set(student.id, student);
        }
      });
    }

    setRecipients(Array.from(residentsMap.values()));
  };

  const loadGrantStudents = async () => {
    if (!supabase || !isSuperAdmin) return;
    const { data } = await supabase
      .from("students")
      .select("id, full_name, room")
      .order("room", { ascending: true });
    setGrantStudents((data as Student[]) || []);
  };

  useEffect(() => {
    loadApartments();
    loadResults();
    loadSchedules();
  }, []);

  useEffect(() => {
    loadAdminBlock();
    loadCouponTtl();
  }, [user?.student_id, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!user?.student_id) return;
    loadCoupons();
    loadRecipients();
  }, [user?.student_id]);

  useEffect(() => {
    loadTransfers();
  }, [user?.student_id, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadGrantStudents();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (apartments.length === 0) return;
    setScoreInputs((prev) => {
      const next = { ...prev };
      apartments.forEach((apt) => {
        if (!(apt.id in next)) {
          next[apt.id] = "";
        }
      });
      return next;
    });
  }, [apartments]);

  useEffect(() => {
    if (schedules.length === 0) return;
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      schedules.forEach((schedule) => {
        next[schedule.block] = {
          date: schedule.check_date || prev[schedule.block]?.date || getNextWednesdayISO(),
          time: schedule.check_time
            ? formatTime(schedule.check_time)
            : prev[schedule.block]?.time || "19:00",
        };
      });
      return next;
    });
  }, [schedules]);

  const refreshResults = async () => {
    await loadResults();
  };

  const refreshCoupons = async () => {
    await loadCoupons();
    await loadTransfers();
  };

  const handleScheduleSave = async (block: Block) => {
    if (!supabase) return;
    const draft = scheduleDrafts[block];
    if (!draft?.date) {
      setScheduleNotice((prev) => ({ ...prev, [block]: "Укажите дату проверки." }));
      return;
    }

    try {
      setScheduleSaving((prev) => ({ ...prev, [block]: true }));
      setScheduleNotice((prev) => ({ ...prev, [block]: null }));
      const response = await authedFetch("/api/admin/cleanup/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          block,
          check_date: draft.date,
          check_time: draft.time || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setScheduleNotice((prev) => ({ ...prev, [block]: mapScheduleError(result.error) }));
        return;
      }

      setScheduleNotice((prev) => ({ ...prev, [block]: "Сохранено." }));
      setReminderNotice((prev) => ({ ...prev, [block]: null }));
      setReminderRecipients((prev) => ({ ...prev, [block]: [] }));
      setReminderFailures((prev) => ({ ...prev, [block]: [] }));
      await loadSchedules();
    } catch (error: any) {
      setScheduleNotice((prev) => ({ ...prev, [block]: mapScheduleError(error?.message) }));
    } finally {
      setScheduleSaving((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handleSendReminder = async (block: Block) => {
    if (!supabase) return;
    const draft = scheduleDrafts[block];
    if (!draft?.date) {
      setReminderNotice((prev) => ({ ...prev, [block]: "Укажите дату проверки." }));
      return;
    }

    try {
      setReminderSending((prev) => ({ ...prev, [block]: true }));
      setReminderNotice((prev) => ({ ...prev, [block]: null }));
      setReminderRecipients((prev) => ({ ...prev, [block]: [] }));
      setReminderFailures((prev) => ({ ...prev, [block]: [] }));
      const scheduleResponse = await authedFetch("/api/admin/cleanup/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          block,
          check_date: draft.date,
          check_time: draft.time || null,
        }),
      });

      const scheduleResult = await scheduleResponse.json();
      if (!scheduleResponse.ok) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: mapScheduleError(scheduleResult.error),
        }));
        return;
      }

      const response = await authedFetch("/api/admin/cleanup/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ block }),
      });

      const result = await response.json();
      if (!response.ok) {
        setReminderNotice((prev) => ({ ...prev, [block]: mapReminderError(result.error) }));
        return;
      }

      const sentList = Array.isArray(result?.sent_to) ? result.sent_to : [];
      const failedList = Array.isArray(result?.failed_to) ? result.failed_to : [];
      setReminderRecipients((prev) => ({ ...prev, [block]: sentList }));
      setReminderFailures((prev) => ({ ...prev, [block]: failedList }));

      if (sentList.length > 0) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: `Отправлено: ${sentList.length}`,
        }));
      } else if (failedList.length > 0) {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: "Не удалось отправить уведомления.",
        }));
      } else {
        setReminderNotice((prev) => ({
          ...prev,
          [block]: "Нет получателей с Telegram.",
        }));
      }

      await loadSchedules();
    } catch (error: any) {
      setReminderNotice((prev) => ({ ...prev, [block]: mapReminderError(error?.message) }));
    } finally {
      setReminderSending((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handleClearResults = async (block: Block) => {
    if (!supabase) return;
    if (!window.confirm(`Удалить все публикации блока ${block}?`)) return;

    try {
      setResultsClearing((prev) => ({ ...prev, [block]: true }));
      setResultsNotice((prev) => ({ ...prev, [block]: null }));
      const response = await authedFetch("/api/admin/cleanup/results/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ block }),
      });

      const result = await response.json();
      if (!response.ok) {
        setResultsNotice((prev) => ({
          ...prev,
          [block]: mapResultsError(result.error),
        }));
        return;
      }

      setResultsNotice((prev) => ({
        ...prev,
        [block]: `Публикации удалены: ${result.deleted || 0}`,
      }));
      await loadResults();
    } catch (error: any) {
      setResultsNotice((prev) => ({
        ...prev,
        [block]: mapResultsError(error?.message),
      }));
    } finally {
      setResultsClearing((prev) => ({ ...prev, [block]: false }));
    }
  };

  const handlePublish = async () => {
    if (!supabase || !announcementText || !selectedApartment || !weekStart) {
      setPublishNotice("Заполните все поля.");
      return;
    }

    if (!isAdmin && !isSuperAdmin) return;

    try {
      setIsPublishing(true);
      setPublishNotice(null);
      const response = await authedFetch("/api/admin/cleanup/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          week_start: weekStart,
          block: selectedBlock,
          apartment_id: selectedApartment,
          announcement_text: announcementText,
          announcement_mode: announcementMode,
          template_key: null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(mapPublishError(result.error));
      }

      setPublishNotice("Результаты опубликованы.");
      await refreshResults();
      await refreshCoupons();
    } catch (error: any) {
      setPublishNotice(mapPublishError(error?.message));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRandomScoreCaption = () => {
    const random = SCORE_CAPTIONS[Math.floor(Math.random() * SCORE_CAPTIONS.length)];
    setScoreCaptionKey(random.key);
  };

  const handleBuildScoreAnnouncement = () => {
    if (!selectedApartment) {
      setPublishNotice("Выберите квартиру-победителя.");
      return;
    }

    const scoreLines = apartmentsForBlock
      .map((apt) => {
        const rawValue = scoreInputs[apt.id];
        if (rawValue === undefined || rawValue === "") return null;
        const parsed = Number(rawValue);
        if (Number.isNaN(parsed)) return null;
        return `${apt.code} — ${formatPoints(parsed)}`;
      })
      .filter(Boolean) as string[];

    if (scoreLines.length === 0) {
      setPublishNotice("Введите баллы хотя бы для одной квартиры.");
      return;
    }

    const winnerCode = apartmentMap[selectedApartment]?.code || "—";
    const lines = [
      "Итоги проверки:",
      "",
      ...scoreLines,
      "",
      `🏆 Победитель: ${winnerCode} 💪`,
    ];

    if (selectedScoreCaption) {
      lines.push(selectedScoreCaption);
    }

    setAnnouncementText(lines.join("\n"));
    setAnnouncementMode("scores");
    setPublishNotice(null);
  };

  const renderScheduleEditor = (block: Block) => {
    const draft = scheduleDrafts[block];
    const current = schedulesByBlock[block];
    const currentLabel = current
      ? `${formatScheduleLabel(current.check_date)}${current.check_time ? `, ${formatTime(current.check_time)}` : ""}`
      : "не назначено";
    const statusClass = current
      ? "border border-amber-200 bg-amber-50 text-amber-800"
      : "border border-gray-200 bg-gray-100 text-gray-500";
    const lastSentLabel = current?.reminder_sent_at
      ? formatDateTime(current.reminder_sent_at)
      : "не отправлялось";

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Блок {block}</h4>
          <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass}`}>
            Сейчас: {currentLabel}. Последняя рассылка: {lastSentLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Дата проверки</label>
            <input
              type="date"
              value={draft?.date || ""}
              onChange={(e) =>
                setScheduleDrafts((prev) => ({
                  ...prev,
                  [block]: { ...prev[block], date: e.target.value },
                }))
              }
              className="w-full rounded-lg border-2 border-gray-200 p-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Время проверки</label>
            <input
              type="time"
              value={draft?.time || ""}
              onChange={(e) =>
                setScheduleDrafts((prev) => ({
                  ...prev,
                  [block]: { ...prev[block], time: e.target.value },
                }))
              }
              className="w-full rounded-lg border-2 border-gray-200 p-2 text-sm text-gray-900"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-end">
            <button
              type="button"
              onClick={() => handleScheduleSave(block)}
              disabled={!!scheduleSaving[block]}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400 md:w-auto"
            >
              {scheduleSaving[block] ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={() => handleSendReminder(block)}
              disabled={!!reminderSending[block]}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-400 md:w-auto"
            >
              {reminderSending[block] ? "Отправка..." : "Разослать напоминание"}
            </button>
          </div>
        </div>
        {scheduleNotice[block] && (
          <p className="text-xs text-blue-600">{scheduleNotice[block]}</p>
        )}
        {reminderNotice[block] && (
          <p className="text-xs text-emerald-600">{reminderNotice[block]}</p>
        )}
        {reminderRecipients[block].length > 0 && (
          <p className="text-xs text-emerald-700">
            Получили: {reminderRecipients[block].map(formatRecipientLabel).join(", ")}
          </p>
        )}
        {reminderFailures[block].length > 0 && (
          <p className="text-xs text-rose-600">
            Не доставлено: {reminderFailures[block].map(formatRecipientLabel).join(", ")}
          </p>
        )}
      </div>
    );
  };

  const handleTransfer = async () => {
    if (!supabase || !transferCouponId || !transferRecipientId) {
      setTransferNotice("Выберите купон и получателя.");
      return;
    }

    try {
      setTransferNotice(null);
      const { error } = await supabase.rpc("transfer_coupon", {
        p_coupon_id: transferCouponId,
        p_to_student_id: transferRecipientId,
      });

      if (error) {
        throw new Error(mapTransferError(error.message));
      }

      setTransferCouponId("");
      setTransferRecipientId("");
      setTransferNotice("Купон передан.");
      await refreshCoupons();
    } catch (error: any) {
      setTransferNotice(mapTransferError(error?.message));
    }
  };

  const handleClearTransfers = async () => {
    if (!supabase) return;
    if (!window.confirm("Очистить историю передач купонов?")) return;

    try {
      setTransferClearing(true);
      setTransferHistoryNotice(null);
      const response = await authedFetch("/api/admin/coupons/transfers/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) {
        setTransferHistoryNotice(result.error || "Ошибка очистки.");
        return;
      }

      setTransfers([]);
      setTransferNames({});
      setTransferHistoryNotice("История передач очищена.");
    } catch (error: any) {
      setTransferHistoryNotice(error?.message || "Ошибка очистки.");
    } finally {
      setTransferClearing(false);
    }
  };

  const handleGrant = async () => {
    if (!supabase || !grantStudentId) {
      setGrantNotice("Выберите студента.");
      return;
    }
    if (grantExpiryMode === "custom" && !grantExpiresAt) {
      setGrantNotice("Укажите срок действия купона.");
      return;
    }

    try {
      const expiresAtPayload =
        grantExpiryMode === "custom" ? new Date(grantExpiresAt).toISOString() : null;

      const response = await authedFetch("/api/admin/coupons/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: grantStudentId,
          count: grantCount,
          note: grantNote,
          expiry_mode: grantExpiryMode,
          expires_at: expiresAtPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapGrantError(result.error));
      }

      setGrantNotice("Купоны выданы.");
      setGrantCount(1);
      setGrantNote("");
      setGrantExpiryMode("default");
      setGrantExpiresAt("");
      await refreshCoupons();
    } catch (error: any) {
      setGrantNotice(mapGrantError(error?.message));
    }
  };

  const renderResultCard = (item: CleanupResult) => {
    const apartment = apartmentMap[item.winning_apartment_id];
    const announcer = item.announced_by ? announcers[item.announced_by] : null;

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-lg font-bold text-gray-900">
              Проверка от {formatWeekLabel(item.week_start)}
            </h4>
            <p className="text-xs text-gray-500">
              Опубликовано: {formatDateTime(item.published_at)}
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            {apartment?.code || "Квартира"}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{item.announcement_text}</p>
        {announcer && (
          <p className="mt-3 text-xs text-gray-500">Объявил: {announcer}</p>
        )}
      </div>
    );
  };

  const renderBlockSection = (block: Block) => {
    const blockResults = resultsByBlock[block];
    const latest = blockResults[0];
    const schedule = schedulesByBlock[block];
    const scheduleText = schedule
      ? `${formatScheduleLabel(schedule.check_date)}${schedule.check_time ? `, ${formatTime(schedule.check_time)}` : ""}`
      : "Дата проверки не назначена.";
    const scheduleClass = schedule
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-gray-200 bg-gray-100 text-gray-500";
    const scheduleIconClass = schedule ? "text-amber-600" : "text-gray-400";

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center">
              <PeopleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Блок {block}
              </h3>
              <p className="text-xs text-gray-500">Результаты уборки</p>
              <div className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-base font-semibold ${scheduleClass}`}>
                <CalendarIcon className={`h-4 w-4 ${scheduleIconClass}`} />
                <span>Проверка: {scheduleText}</span>
              </div>
            </div>
          </div>
          {(isAdmin || isSuperAdmin) && (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => handleClearResults(block)}
                disabled={!!resultsClearing[block]}
                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:border-gray-200 disabled:text-gray-400"
              >
                {resultsClearing[block] ? "Удаление..." : "Очистить публикации"}
              </button>
              {resultsNotice[block] && (
                <span className="text-xs text-slate-600">{resultsNotice[block]}</span>
              )}
            </div>
          )}
        </div>

        {latest ? (
          renderResultCard(latest)
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            Результатов пока нет.
          </div>
        )}

        {blockResults.length > 1 && (
          <details className="rounded-xl border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              Архив результатов ({blockResults.length - 1})
            </summary>
            <div className="mt-3 space-y-3">
              {blockResults.slice(1).map(renderResultCard)}
            </div>
          </details>
        )}
      </div>
    );
  };

  const transferableCoupons = coupons.filter((coupon) => {
    const isExpired = new Date(coupon.expires_at).getTime() <= Date.now();
    return !coupon.used_in_queue_id && !coupon.reserved_queue_id && !isExpired;
  });

  const scheduleBlocks = (isSuperAdmin
    ? ["A", "B"]
    : adminBlock
      ? [adminBlock]
      : []) as Block[];

  const showTransfers = !!user && (isAdmin || isSuperAdmin || transfers.length > 0);

  return (
    <div className={embedded ? "w-full" : "min-h-screen bg-gray-50"}>
      {!embedded && (
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 shadow-lg">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Результаты уборки</h1>
              <p className="text-sm text-blue-100">Объявления по блокам и архив</p>
            </div>
            <Link href="/" className="text-sm text-blue-100 underline">
              На главную
            </Link>
          </div>
        </header>
      )}

      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {renderBlockSection("A")}
          {renderBlockSection("B")}
        </div>

        {(isAdmin || isSuperAdmin) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Публикация результатов</h3>
            </div>

            {couponTtlSeconds !== null && (
              <p className="text-xs text-gray-500">
                Купоны действуют {formatTtlLabel(couponTtlSeconds)}
              </p>
            )}

            {!isSuperAdmin && !adminBlock && (
              <p className="text-sm text-red-600">
                Для публикации нужен назначенный блок.
              </p>
            )}

            {scheduleBlocks.length > 0 && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Расписание проверки</h4>
                </div>
                <div className="space-y-3">
                  {scheduleBlocks.map((block) => (
                    <div key={block}>{renderScheduleEditor(block)}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Дата итогов</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Блок</label>
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value as Block)}
                  disabled={!isSuperAdmin && !!adminBlock}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="A">Блок A</option>
                  <option value="B">Блок B</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Квартира-победитель</label>
                <select
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                >
                  <option value="">Выберите квартиру</option>
                  {apartments
                    .filter((apt) => !apt.block || apt.block === selectedBlock)
                    .map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.code}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-gray-700">Баллы по квартирам</h4>
                <button
                  type="button"
                  onClick={handleBuildScoreAnnouncement}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Сформировать сообщение
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {apartmentsForBlock.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-2">
                    <span className="w-16 text-sm font-semibold text-gray-700">{apt.code}</span>
                    <input
                      type="number"
                      min={0}
                      value={scoreInputs[apt.id] ?? ""}
                      onChange={(e) =>
                        setScoreInputs((prev) => ({
                          ...prev,
                          [apt.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border-2 border-gray-200 p-2 text-sm text-gray-900"
                      placeholder="Баллы"
                    />
                    <span className="text-xs text-gray-400">баллов</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={scoreCaptionKey}
                  onChange={(e) => setScoreCaptionKey(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-sm text-gray-900 md:w-auto"
                >
                  {SCORE_CAPTIONS.map((caption) => (
                    <option key={caption.key} value={caption.key}>
                      {caption.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRandomScoreCaption}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Случайная подпись
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Победителя выбирайте в поле "Квартира-победитель" выше.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Сообщение</label>
              <textarea
                value={announcementText}
                onChange={(e) => {
                  setAnnouncementText(e.target.value);
                  setAnnouncementMode("manual");
                }}
                rows={4}
                className="w-full rounded-lg border-2 border-gray-200 p-3 text-gray-900"
                placeholder="Напишите сообщение для блока"
              />
            </div>

            {publishNotice && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {publishNotice}
              </div>
            )}

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || (!isSuperAdmin && !adminBlock)}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-400"
            >
              {isPublishing ? "Публикация..." : "Опубликовать результаты"}
            </button>
          </div>
        )}

        {user && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Мои купоны</h3>
              </div>

              {coupons.length === 0 ? (
                <p className="text-sm text-gray-500">Пока нет купонов.</p>
              ) : (
                <div className="space-y-2">
                  {coupons.map((coupon) => {
                    const isExpired = new Date(coupon.expires_at).getTime() <= Date.now();
                    const status = coupon.used_in_queue_id
                      ? "Использован"
                      : coupon.reserved_queue_id
                        ? "В очереди"
                        : isExpired
                          ? "Сгорел"
                          : "Активен";

                    return (
                      <div
                        key={coupon.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{status}</span>
                          <span className="text-xs text-gray-500">
                            До: {formatDateTime(coupon.expires_at)}
                          </span>
                        </div>
                        {coupon.note && (
                          <p className="text-xs text-gray-500 mt-1">{coupon.note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <MoneyIcon className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Передать купон</h3>
              </div>

              {recipients.length === 0 ? (
                <p className="text-sm text-gray-500">Нет получателей в вашей квартире.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Купон</label>
                    <select
                      value={transferCouponId}
                      onChange={(e) => setTransferCouponId(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                    >
                      <option value="">Выберите купон</option>
                      {transferableCoupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          Купон до {formatDateTime(coupon.expires_at)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Кому передать</label>
                    <select
                      value={transferRecipientId}
                      onChange={(e) => setTransferRecipientId(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                    >
                      <option value="">Выберите студента</option>
                      {recipients.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} {student.room ? `(${student.room})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {transferNotice && (
                    <p className="text-sm text-blue-600">{transferNotice}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleTransfer}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Передать
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {showTransfers && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Передачи купонов</h3>
              </div>
              {(isAdmin || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={handleClearTransfers}
                  disabled={transferClearing}
                  className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:border-gray-200 disabled:text-gray-400"
                >
                  {transferClearing ? "Очистка..." : "Очистить историю"}
                </button>
              )}
            </div>
            {transferHistoryNotice && (
              <p className="text-xs text-slate-600">{transferHistoryNotice}</p>
            )}
            {transfers.length === 0 ? (
              <p className="text-sm text-gray-500">Пока нет передач.</p>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span>
                      {transferNames[transfer.from_student_id] || "Кто-то"}
                      {" -> "}
                      {transferNames[transfer.to_student_id] || "Кто-то"}
                    </span>
                    <span className="text-xs text-gray-500">{formatDateTime(transfer.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">Выдать купоны вручную</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Студент</label>
                <select
                  value={grantStudentId}
                  onChange={(e) => setGrantStudentId(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                >
                  <option value="">Выберите студента</option>
                  {grantStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} {student.room ? `(${student.room})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Количество</label>
                <input
                  type="number"
                  min={1}
                  value={grantCount}
                  onChange={(e) => setGrantCount(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Срок действия</label>
                <select
                  value={grantExpiryMode}
                  onChange={(e) => {
                    const mode = e.target.value as "default" | "custom" | "permanent";
                    setGrantExpiryMode(mode);
                    if (mode !== "custom") {
                      setGrantExpiresAt("");
                    }
                  }}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                >
                  <option value="default">По умолчанию</option>
                  <option value="custom">До даты/времени</option>
                  <option value="permanent">Бессрочно</option>
                </select>
              </div>
              {grantExpiryMode === "custom" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Действует до</label>
                  <input
                    type="datetime-local"
                    value={grantExpiresAt}
                    onChange={(e) => setGrantExpiresAt(e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Комментарий</label>
              <input
                type="text"
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                placeholder="Причина или примечание"
              />
            </div>
            {grantNotice && (
              <p className="text-sm text-blue-600">{grantNotice}</p>
            )}
            <button
              type="button"
              onClick={handleGrant}
              className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Выдать купоны
            </button>
          </div>
        )}
      </div>
    </div>
  );
}






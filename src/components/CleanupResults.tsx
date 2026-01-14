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

const getNextWednesdayISO = () => {
  const now = new Date();
  const currentDay = now.getDay();
  const targetDay = 3;
  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next.toISOString().slice(0, 10);
};

const formatWeekLabel = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
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

const formatTtlLabel = (seconds: number) => {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} мин.`;
  }
  return `${seconds} сек.`;
};

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
  const [adminBlock, setAdminBlock] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(getNextWednesdayISO());
  const [selectedBlock, setSelectedBlock] = useState("A");
  const [selectedApartment, setSelectedApartment] = useState<string>("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementMode, setAnnouncementMode] = useState("manual");
  const [publishNotice, setPublishNotice] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [transferCouponId, setTransferCouponId] = useState("");
  const [transferRecipientId, setTransferRecipientId] = useState("");
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
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
  const [scheduleDrafts, setScheduleDrafts] = useState(() => ({
    A: { date: getNextWednesdayISO(), time: "" },
    B: { date: getNextWednesdayISO(), time: "" },
  }));
  const [scheduleNotice, setScheduleNotice] = useState<Record<string, string | null>>({});
  const [scheduleSaving, setScheduleSaving] = useState<Record<string, boolean>>({});

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
    return schedules.reduce<Record<string, CleanupSchedule>>((acc, schedule) => {
      acc[schedule.block] = schedule;
      return acc;
    }, {});
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
      .select("block, check_date, check_time, reminder_time, set_by, updated_at, reminder_sent_at");

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

    const block = adminApartment?.block || null;
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
    if (!supabase || !user?.student_id) return;
    const { data } = await supabase
      .from("coupon_transfers")
      .select("id, coupon_id, from_student_id, to_student_id, performed_by, created_at, note")
      .or(`from_student_id.eq.${user.student_id},to_student_id.eq.${user.student_id}`)
      .order("created_at", { ascending: false });

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
    loadTransfers();
    loadRecipients();
  }, [user?.student_id]);

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
          time: schedule.check_time ? formatTime(schedule.check_time) : "",
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

  const handleScheduleSave = async (block: "A" | "B") => {
    if (!supabase) return;
    const draft = scheduleDrafts[block];
    if (!draft?.date) {
      setScheduleNotice((prev) => ({ ...prev, [block]: "Укажите дату проверки." }));
      return;
    }

    try {
      setScheduleSaving((prev) => ({ ...prev, [block]: true }));
      setScheduleNotice((prev) => ({ ...prev, [block]: null }));
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        setScheduleNotice((prev) => ({ ...prev, [block]: "Не удалось получить токен." }));
        return;
      }

      const response = await fetch("/api/admin/cleanup/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          block,
          check_date: draft.date,
          check_time: draft.time || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(mapScheduleError(result.error));
      }

      setScheduleNotice((prev) => ({ ...prev, [block]: "Расписание обновлено." }));
      await loadSchedules();
    } catch (error: any) {
      setScheduleNotice((prev) => ({ ...prev, [block]: mapScheduleError(error?.message) }));
    } finally {
      setScheduleSaving((prev) => ({ ...prev, [block]: false }));
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
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        setPublishNotice("Не удалось получить токен.");
        return;
      }

      const response = await fetch("/api/admin/cleanup/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  const renderScheduleEditor = (block: "A" | "B") => {
    const draft = scheduleDrafts[block];
    const current = schedulesByBlock[block];
    const currentLabel = current
      ? `${formatWeekLabel(current.check_date)}${current.check_time ? `, ${formatTime(current.check_time)}` : ""}`
      : "не назначено";

    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Блок {block}</h4>
          <span className="text-xs text-gray-500">Сейчас: {currentLabel}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => handleScheduleSave(block)}
              disabled={!!scheduleSaving[block]}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {scheduleSaving[block] ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
        {scheduleNotice[block] && (
          <p className="text-xs text-blue-600">{scheduleNotice[block]}</p>
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
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        setGrantNotice("Не удалось получить токен.");
        return;
      }

      const expiresAtPayload =
        grantExpiryMode === "custom" ? new Date(grantExpiresAt).toISOString() : null;

      const response = await fetch("/api/admin/coupons/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  const renderBlockSection = (block: "A" | "B") => {
    const blockResults = resultsByBlock[block];
    const latest = blockResults[0];
    const schedule = schedulesByBlock[block];
    const scheduleLabel = schedule
      ? `Следующая проверка: ${formatWeekLabel(schedule.check_date)}${schedule.check_time ? `, ${formatTime(schedule.check_time)}` : ""}`
      : "Дата проверки не назначена.";

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center">
            <PeopleIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Блок {block}
            </h3>
            <p className="text-xs text-gray-500">Результаты уборки</p>
            <p className="text-xs text-gray-500">{scheduleLabel}</p>
          </div>
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
      : []) as ("A" | "B")[];

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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Время проверки</label>
                <input
                  type="time"
                  value={checkTime}
                  onChange={(e) => setCheckTime(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 p-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Блок</label>
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
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

        {user && transfers.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">История передач</h3>
            </div>
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






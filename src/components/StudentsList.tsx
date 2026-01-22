"use client";

import { useEffect, useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { Student } from "@/types";
import {
  ListIcon,
  RoomIcon,
  TelegramIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  EyeIcon,
  DeleteIcon,
  KeyIcon,
  WashingSpinner,
} from "@/components/Icons";
import Avatar from "@/components/Avatar";
import AddStudentModal from "@/components/AddStudentModal";

export default function StudentsList() {
  const { students, isAdmin, isSuperAdmin, isCleanupAdmin, user, updateStudent, deleteStudent } = useLaundry();
  const { t } = useUi();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editRoom, setEditRoom] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editCanViewStudents, setEditCanViewStudents] = useState(false);
  const [editCleanupAdmin, setEditCleanupAdmin] = useState(false);
  const [editStayType, setEditStayType] = useState<"unknown" | "5days" | "weekends">("unknown");
  const [editKeyIssued, setEditKeyIssued] = useState(false);
  const [editKeyLost, setEditKeyLost] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [stayFilter, setStayFilter] = useState<"all" | "weekends" | "5days" | "unknown">("all");

  useEffect(() => {
    if (!notice) return;
    const timeoutMs = notice.type === "success" ? 3500 : 6000;
    const timer = window.setTimeout(() => setNotice(null), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const canManageStudents = isAdmin || isSuperAdmin || isCleanupAdmin;
  const canDeleteStudents = isAdmin || isSuperAdmin;
  const showTelegramColumn = !isCleanupAdmin || isAdmin || isSuperAdmin;

  const badgeBase = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold";

  const canManageStudent = (student: Student) =>
    canManageStudents && (!student.is_super_admin || student.id === user?.student_id);

  if (!students || students.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <ListIcon className="w-8 h-8" />{t("students.title")}
        </h2>
        <p className="text-gray-700 text-lg">{t("students.empty")}</p>
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) => {
    const blockA = a.room?.charAt(0) || "Z";
    const blockB = b.room?.charAt(0) || "Z";
    if (blockA !== blockB) {
      return blockA.localeCompare(blockB);
    }

    const roomA = parseInt(a.room?.slice(1) || "9999", 10);
    const roomB = parseInt(b.room?.slice(1) || "9999", 10);
    if (roomA !== roomB) {
      return roomA - roomB;
    }

    const lastNameA = a.last_name?.toLowerCase() || "";
    const lastNameB = b.last_name?.toLowerCase() || "";
    return lastNameA.localeCompare(lastNameB);
  });

  const filteredStudents = sortedStudents.filter((student) => {
    if (stayFilter !== "all") {
      const stay = (student.stay_type || "unknown") as "unknown" | "5days" | "weekends";
      if (stay !== stayFilter) return false;
    }

    return true;
  });

  const blockA = filteredStudents.filter((s) => s.room?.startsWith("A"));
  const blockB = filteredStudents.filter((s) => s.room?.startsWith("B"));

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsSavingEdit(false);
    setEditRoom(student.room || "");
    setEditFirstName(student.first_name || "");
    setEditLastName(student.last_name || "");
    setEditMiddleName(student.middle_name || "");
    setEditCanViewStudents(!!student.can_view_students);
    setEditCleanupAdmin(!!student.is_cleanup_admin);
    setEditStayType((student.stay_type as any) || "unknown");
    setEditKeyIssued(!!student.key_issued);
    setEditKeyLost(!!student.key_lost);
    setNotice(null);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    if (isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      await updateStudent(editingStudent.id, {
        room: editRoom,
        first_name: editFirstName,
        last_name: editLastName || undefined,
        middle_name: editMiddleName || undefined,
        can_view_students: isSuperAdmin ? editCanViewStudents : undefined,
        is_cleanup_admin: isSuperAdmin ? editCleanupAdmin : undefined,
        stay_type: editStayType,
        key_issued: editKeyIssued,
        key_lost: editKeyLost,
      });

      setEditingStudent(null);
      setNotice({ type: "success", message: t("students.updateSuccess") });
    } catch (error: any) {
      const message = typeof error?.message === "string" && error.message.trim() ? error.message.trim() : t("students.updateError");
      setNotice({ type: "error", message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!canDeleteStudents || !canManageStudent(student)) return;

    if (!confirm(t("students.deleteConfirm", { name: student.full_name }))) return;

    const studentName =
      student.full_name ||
      [student.first_name, student.last_name, student.middle_name]
        .filter(Boolean)
        .join(" ") ||
      "-";

    try {
      await deleteStudent(student.id);
      setNotice({
        type: "success",
        message: t("students.deleteSuccessToast", { name: studentName }),
      });
    } catch {
      setNotice({
        type: "error",
        message: t("students.deleteErrorToast", { name: studentName }),
      });
    }
  };

  const hasTelegram = (student: Student) => {
    const chat = typeof student.telegram_chat_id === "string" ? student.telegram_chat_id.trim() : "";
    return !!chat && !student.is_banned;
  };

  const renderStudentRow = (student: Student, index: number) => {
    const displayName =
      [student.first_name, student.last_name, student.middle_name].filter(Boolean).join(" ") ||
      student.full_name ||
      "-";

    const stayType = (student.stay_type || "unknown") as "unknown" | "5days" | "weekends";
    const stayLabel =
      stayType === "weekends"
        ? t("students.stay.weekends")
        : stayType === "5days"
          ? t("students.stay.5days")
          : t("students.stay.unknown");

    return (
      <tr
        key={student.id}
        className="border-b border-slate-200/70 text-xs last:border-b-0 dark:border-slate-700/60"
      >
        <td className="px-2 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {index + 1}
        </td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-2">
            <Avatar
              name={student.full_name}
              style={student.avatar_style}
              seed={student.avatar_seed}
              className="h-8 w-8"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {displayName}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {student.is_super_admin && (
                  <span className={`${badgeBase} border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200`}>
                    {t("admin.status.superAdmin")}
                  </span>
                )}
                {!student.is_super_admin && student.is_admin && (
                  <span className={`${badgeBase} border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-900/30 dark:text-violet-200`}>
                    {t("admin.status.admin")}
                  </span>
                )}
                {student.is_cleanup_admin && (
                  <span className={`${badgeBase} border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-900/35 dark:text-indigo-200`}>
                    {t("header.leader")}
                  </span>
                )}
                {student.is_banned && (
                  <span className={`${badgeBase} border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200`}>
                    {t("admin.status.banned")}
                  </span>
                )}
                {isSuperAdmin && (
                  <span className={`${badgeBase} flex items-center gap-1 ${
                    student.can_view_students
                      ? "border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-violet-800/40 dark:bg-violet-900/25 dark:text-violet-200"
                      : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
                  }`}>
                    <EyeIcon className="h-3 w-3" />
                    {student.can_view_students ? t("students.listOpen") : t("students.listClosed")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {student.room || "-"}
        </td>
        <td className="px-2 py-2">
          <span
            className={`${badgeBase} ${
              stayType === "weekends"
                ? "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/50 dark:bg-blue-900/35 dark:text-blue-200"
                : stayType === "5days"
                  ? "border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200"
                  : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-100"
            }`}
          >
            {stayLabel}
          </span>
        </td>
        <td className="px-2 py-2">
          <span
            className={`${badgeBase} flex items-center gap-1 ${
              student.key_issued
                ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-100"
                : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
            }`}
          >
            <KeyIcon className="h-3.5 w-3.5" />
            {student.key_issued ? t("students.keyIssued") : t("students.keyNone")}
          </span>
        </td>
        <td className="px-2 py-2">
          {student.key_lost ? (
            <span className={`${badgeBase} border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200`}>
              {t("students.keyLost")}
            </span>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )}
        </td>
        <td className="px-2 py-2">
          {showTelegramColumn ? (
            <div title={hasTelegram(student) ? t("students.connected") : t("students.notConnected")}>
              {hasTelegram(student) ? (
                <TelegramIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              ) : (
                <CloseIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              )}
            </div>
          ) : (
            <span className="text-slate-300 dark:text-slate-600">—</span>
          )}
        </td>
        <td className="px-2 py-2">
          <div title={student.is_registered ? t("students.badge.registered") : t("students.badge.unregistered")}>
            {student.is_registered ? (
              <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <CloseIcon className="h-5 w-5 text-rose-500 dark:text-rose-300" />
            )}
          </div>
        </td>
        <td className="px-2 py-2">
          {canManageStudent(student) && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openEditModal(student)}
                className="btn btn-primary px-2 py-1"
              >
                <EditIcon className="h-4 w-4" />
              </button>
              {canDeleteStudents && (
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(student)}
                  className="btn btn-danger px-2 py-1"
                >
                  <DeleteIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  };

  const renderStudentCompact = (student: Student, index: number) => {
    const displayName =
      [student.first_name, student.last_name, student.middle_name].filter(Boolean).join(" ") ||
      student.full_name ||
      "-";

    const stayType = (student.stay_type || "unknown") as "unknown" | "5days" | "weekends";
    const stayLabel =
      stayType === "weekends"
        ? t("students.stay.weekends")
        : stayType === "5days"
          ? t("students.stay.5days")
          : t("students.stay.unknown");

    return (
      <div
        key={student.id}
        className="flex items-center gap-2 border-b border-slate-200/70 px-2 py-2 last:border-b-0 dark:border-slate-700/60"
      >
        <div className="w-5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">{index + 1}</div>
        <Avatar
          name={student.full_name}
          style={student.avatar_style}
          seed={student.avatar_seed}
          className="h-8 w-8"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {student.room || "-"}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={`${badgeBase} ${
                stayType === "weekends"
                  ? "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/50 dark:bg-blue-900/35 dark:text-blue-200"
                  : stayType === "5days"
                    ? "border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200"
                    : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-100"
              }`}
            >
              {stayLabel}
            </span>
            <span
              className={`${badgeBase} flex items-center gap-1 ${
                student.key_issued
                  ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-400/50 dark:bg-blue-500/15 dark:text-blue-100"
                  : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
              }`}
            >
              <KeyIcon className="h-3.5 w-3.5" />
              {student.key_issued ? t("students.keyIssued") : t("students.keyNone")}
            </span>
            {student.key_lost && (
              <span className={`${badgeBase} border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200`}>
                {t("students.keyLost")}
              </span>
            )}
            {student.is_super_admin && (
              <span className={`${badgeBase} border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200`}>
                {t("admin.status.superAdmin")}
              </span>
            )}
            {!student.is_super_admin && student.is_admin && (
              <span className={`${badgeBase} border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-500/40 dark:bg-violet-900/30 dark:text-violet-200`}>
                {t("admin.status.admin")}
              </span>
            )}
            {student.is_cleanup_admin && (
              <span className={`${badgeBase} border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-900/35 dark:text-indigo-200`}>
                {t("header.leader")}
              </span>
            )}
            {student.is_banned && (
              <span className={`${badgeBase} border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200`}>
                {t("admin.status.banned")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {showTelegramColumn && (
            <div title={hasTelegram(student) ? t("students.connected") : t("students.notConnected")}>
              {hasTelegram(student) ? (
                <TelegramIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              ) : (
                <CloseIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              )}
            </div>
          )}
          <div title={student.is_registered ? t("students.badge.registered") : t("students.badge.unregistered")}>
            {student.is_registered ? (
              <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <CloseIcon className="h-5 w-5 text-rose-500 dark:text-rose-300" />
            )}
          </div>
          {canManageStudent(student) && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openEditModal(student)}
                className="btn btn-primary px-2 py-1"
              >
                <EditIcon className="h-4 w-4" />
              </button>
              {canDeleteStudents && (
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(student)}
                  className="btn btn-danger px-2 py-1"
                >
                  <DeleteIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4 px-4 pt-4 pb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <ListIcon className="w-8 h-8" />{t("students.title")} ({filteredStudents.length}/{students.length})
          </h2>
          {canManageStudents && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              + {t("students.add")}
            </button>
          )}
        </div>

        {notice && (
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={`fixed bottom-6 left-1/2 z-[120] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border px-4 py-3 text-left text-sm shadow-lg transition-all ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-rose-200"
            }`}
          >
            {notice.message}
          </button>
        )}

        <div className="px-4 pb-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <span className="col-span-2 text-xs font-bold text-slate-700 dark:text-slate-200 sm:col-auto">
                  {t("students.filter.stay")}
                </span>
                <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setStayFilter("all")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "all"
                        ? "bg-blue-50 text-blue-700 border-blue-600 dark:bg-slate-900/60 dark:text-blue-200 dark:border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "all"}
                  >
                    {t("students.filter.all")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStayFilter("unknown")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "unknown"
                        ? "bg-blue-50 text-blue-700 border-blue-600 dark:bg-slate-900/60 dark:text-blue-200 dark:border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "unknown"}
                  >
                    {t("students.stay.unknown")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStayFilter("5days")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "5days"
                        ? "bg-blue-50 text-blue-700 border-blue-600 dark:bg-slate-900/60 dark:text-blue-200 dark:border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "5days"}
                  >
                    {t("students.stay.5days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStayFilter("weekends")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "weekends"
                        ? "bg-blue-50 text-blue-700 border-blue-600 dark:bg-slate-900/60 dark:text-blue-200 dark:border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "weekends"}
                  >
                    {t("students.stay.weekends")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-4 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 px-1">
              <RoomIcon className="w-5 h-5" />{t("students.blockA")} ({blockA.length})
            </h3>
            <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="divide-y divide-slate-200 dark:divide-slate-700 md:hidden">
                {blockA.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t("students.empty")}
                  </div>
                ) : (
                  blockA.map((student, index) => renderStudentCompact(student, index))
                )}
              </div>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                    <tr>
                      <th className="w-8 px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">{t("students.title")}</th>
                      <th className="w-20 px-2 py-2 text-left">{t("students.field.room")}</th>
                      <th className="w-28 px-2 py-2 text-left">{t("students.stay.label")}</th>
                      <th className="w-28 px-2 py-2 text-left">{t("students.keyIssued")}</th>
                      <th className="w-24 px-2 py-2 text-left">{t("students.keyLost")}</th>
                      <th className="w-20 px-2 py-2 text-left">{t("students.telegram")}</th>
                      <th className="w-24 px-2 py-2 text-left">{t("students.badge.registered")}</th>
                      <th className="w-20 px-2 py-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900/30">
                    {blockA.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          {t("students.empty")}
                        </td>
                      </tr>
                    ) : (
                      blockA.map((student, index) => renderStudentRow(student, index))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 px-1">
              <RoomIcon className="w-5 h-5" />{t("students.blockB")} ({blockB.length})
            </h3>
            <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="divide-y divide-slate-200 dark:divide-slate-700 md:hidden">
                {blockB.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t("students.empty")}
                  </div>
                ) : (
                  blockB.map((student, index) => renderStudentCompact(student, index))
                )}
              </div>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                    <tr>
                      <th className="w-8 px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-left">{t("students.title")}</th>
                      <th className="w-20 px-2 py-2 text-left">{t("students.field.room")}</th>
                      <th className="w-28 px-2 py-2 text-left">{t("students.stay.label")}</th>
                      <th className="w-28 px-2 py-2 text-left">{t("students.keyIssued")}</th>
                      <th className="w-24 px-2 py-2 text-left">{t("students.keyLost")}</th>
                      <th className="w-20 px-2 py-2 text-left">{t("students.telegram")}</th>
                      <th className="w-24 px-2 py-2 text-left">{t("students.badge.registered")}</th>
                      <th className="w-20 px-2 py-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900/30">
                    {blockB.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          {t("students.empty")}
                        </td>
                      </tr>
                    ) : (
                      blockB.map((student, index) => renderStudentRow(student, index))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <EditIcon className="w-5 h-5" />{t("students.editTitle")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">{t("students.field.lastName")}</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">{t("students.field.firstName")}</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">{t("students.field.middleName")}</label>
                <input
                  type="text"
                  value={editMiddleName}
                  onChange={(e) => setEditMiddleName(e.target.value)}
                  placeholder={t("students.field.middleNamePlaceholder")}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">{t("students.field.room")}</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder={t("students.field.roomPlaceholder")}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
                />
              </div>

              {canManageStudents && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900/40">
                  <div className="col-span-2 flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {t("students.stay.label")}
                    </label>
                    <select
                      value={editStayType}
                      onChange={(e) => setEditStayType(e.target.value as any)}
                      className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-blue-600 dark:focus:ring-blue-500/30"
                    >
                      <option value="unknown">{t("students.stay.unknown")}</option>
                      <option value="5days">{t("students.stay.5days")}</option>
                      <option value="weekends">{t("students.stay.weekends")}</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={editKeyIssued}
                      onChange={(e) => setEditKeyIssued(e.target.checked)}
                      className="h-5 w-5 cursor-pointer"
                    />
                    {t("students.keyIssued")}
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={editKeyLost}
                      onChange={(e) => setEditKeyLost(e.target.checked)}
                      className="h-5 w-5 cursor-pointer"
                    />
                    {t("students.keyLost")}
                  </label>
                </div>
              )}

              {isSuperAdmin && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                  <input
                    type="checkbox"
                    id="canViewStudents"
                    checked={editCanViewStudents}
                    onChange={(e) => setEditCanViewStudents(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label
                    htmlFor="canViewStudents"
                    className="text-sm font-semibold text-gray-900 cursor-pointer flex items-center gap-1 dark:text-slate-100"
                  >
                    <EyeIcon className="w-4 h-4" />{t("students.canView")}
                  </label>
                </div>
              )}

              {isSuperAdmin && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                  <input
                    type="checkbox"
                    id="cleanupAdmin"
                    checked={editCleanupAdmin}
                    onChange={(e) => setEditCleanupAdmin(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label
                    htmlFor="cleanupAdmin"
                    className="text-sm font-semibold text-gray-900 cursor-pointer dark:text-slate-100"
                  >
                      {t("header.leader")}
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingStudent(null)}
                disabled={isSavingEdit}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-violet-800 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? (
                  <>
                    <WashingSpinner className="w-5 h-5" />
                    {t("common.saving")}
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5" />
                    {t("common.save")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}

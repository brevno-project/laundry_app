"use client";

import React, { useEffect, useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { Student } from "@/types";
import {
  ListIcon,
  RoomIcon,
  DoorIcon,
  TelegramIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  EyeIcon,
  KeyIcon,
  DeleteIcon,
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
  const [registrationFilter, setRegistrationFilter] = useState<"all" | "registered" | "unregistered">("all");

  useEffect(() => {
    if (!notice) return;
    const timeoutMs = notice.type === "success" ? 3500 : 6000;
    const timer = window.setTimeout(() => setNotice(null), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const canManageStudents = isAdmin || isSuperAdmin || isCleanupAdmin;
  const canDeleteStudents = isAdmin || isSuperAdmin;
  const canViewRegistration = isAdmin || isSuperAdmin;

  const badgeBase = "rounded-full border border-slate-200/60 dark:border-slate-700";

  const canManageStudent = (student: Student) =>
    canManageStudents && (!student.is_super_admin || student.id === user?.student_id);

  if (!students || students.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
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

    if (canViewRegistration) {
      if (registrationFilter === "registered" && !student.is_registered) return false;
      if (registrationFilter === "unregistered" && student.is_registered) return false;
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

  const renderStudentRow = (student: Student, index: number, list: Student[]) => {
    const prevStudent = index > 0 ? list[index - 1] : null;
    const showDivider = prevStudent && prevStudent.room !== student.room;
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
      <React.Fragment key={student.id}>
        {showDivider && (
          <tr className="bg-gradient-to-r from-transparent via-gray-400 to-transparent dark:via-slate-600">
            <td colSpan={canManageStudents ? 5 : 4} className="h-1"></td>
          </tr>
        )}
        <tr className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/70 transition-colors">
          <td className="p-3 text-gray-700 dark:text-slate-300">{index + 1}</td>
          <td className="p-3 text-gray-900 dark:text-slate-100">
            <div className="flex items-center gap-3">
              <Avatar name={student.full_name} style={student.avatar_style} seed={student.avatar_seed} className="w-10 h-10" />
              <div className="flex flex-col">
                <span>{displayName}</span>
                {canManageStudents && (
                  <span className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-gray-600 dark:text-slate-300">
                    {canViewRegistration && (
                      <span
                        className={`${badgeBase} px-2 py-0.5 ${
                          student.is_registered
                            ? "bg-emerald-100 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/25 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/25 dark:text-amber-200"
                        }`}
                      >
                        {student.is_registered
                          ? t("students.badge.registered")
                          : t("students.badge.unregistered")}
                      </span>
                    )}
                    <span
                      className={`${badgeBase} px-2 py-0.5 ${
                        stayType === "weekends"
                          ? "bg-sky-100 text-sky-800 dark:border-sky-800/40 dark:bg-sky-900/25 dark:text-sky-200"
                          : stayType === "5days"
                            ? "bg-indigo-100 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200"
                            : "bg-gray-100 text-gray-600 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-100"
                      }`}
                    >
                      {stayLabel}
                    </span>
                    <span
                      className={`${badgeBase} inline-flex items-center gap-1 px-2 py-0.5 ${
                        student.key_issued
                          ? "bg-blue-100 text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/25 dark:text-blue-200"
                          : "bg-gray-100 text-gray-500 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
                      }`}
                    >
                      <KeyIcon className="w-3 h-3" />
                      {student.key_issued ? t("students.keyIssued") : t("students.keyNone")}
                    </span>
                    {student.key_lost && (
                      <span className={`${badgeBase} inline-flex items-center gap-1 bg-red-100 px-2 py-0.5 text-red-700 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-200`}>
                        <KeyIcon className="w-3 h-3" />
                        {t("students.keyLost")}
                      </span>
                    )}
                    {isSuperAdmin && student.is_cleanup_admin && (
                      <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200">
                        {t("header.leader")}
                      </span>
                    )}
                    {isSuperAdmin && (
                      <span
                        className={`${badgeBase} px-2 py-0.5 ${
                          student.can_view_students
                            ? "bg-indigo-100 text-indigo-700 dark:border-violet-800/40 dark:bg-violet-900/25 dark:text-violet-200"
                            : "bg-gray-100 text-gray-500 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
                        }`}
                      >
                        <EyeIcon className="w-3 h-3 inline-block mr-1" />
                        {student.can_view_students ? t("students.listOpen") : t("students.listClosed")}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="p-3 text-center text-gray-900">
            {student.room ? (
              <span className="rounded border border-slate-200/60 bg-blue-100 px-2 py-1 font-semibold text-blue-900 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-100">{student.room}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>
          <td className="p-3 text-center">
            {hasTelegram(student) ? (
              <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
                <CheckIcon className="w-4 h-4" />{t("students.connected")}
              </span>
            ) : (
              <span className="text-gray-400 flex items-center justify-center gap-1">
                <CloseIcon className="w-4 h-4" />{t("students.notConnected")}
              </span>
            )}
          </td>
          <td className="p-3 text-center">
            {canManageStudent(student) && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => openEditModal(student)}
                  className="btn btn-primary px-3 py-1 text-sm"
                >
                  <EditIcon className="w-4 h-4 inline-block mr-1" />{t("students.edit")}
                </button>
                    {canDeleteStudents && (
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="btn btn-danger px-3 py-1 text-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                      >
                        <DeleteIcon className="w-4 h-4 inline-block mr-1" />{t("students.delete")}
                      </button>
                    )}
              </div>
            )}
          </td>
        </tr>
      </React.Fragment>
    );
  };

  const renderMobileRow = (student: Student, index: number, list: Student[], tone: "blue" | "green") => {
    const prevStudent = index > 0 ? list[index - 1] : null;
    const showDivider = prevStudent && prevStudent.room !== student.room;
    const rowBorder = "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800";
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
      <React.Fragment key={student.id}>
        {showDivider && (
          <tr
            className="bg-gradient-to-r from-transparent via-slate-400 to-transparent dark:via-slate-600"
          >
            <td colSpan={canManageStudents ? 5 : 4} className="h-0.5"></td>
          </tr>
        )}
        <tr className={`border-b ${rowBorder}`}>
          <td className="p-1 text-gray-900 font-semibold">{index + 1}</td>
          <td className="p-1 text-gray-900">
            <div className="flex items-center gap-2">
              <Avatar name={student.full_name} style={student.avatar_style} seed={student.avatar_seed} className="w-8 h-8" />
              <div className="flex flex-col">
                <span className="text-xs">{displayName}</span>
                {canManageStudents && (
                  <span className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold text-gray-600 dark:text-slate-300">
                    {canViewRegistration && (
                      <span
                        className={`${badgeBase} px-1.5 py-0.5 ${
                          student.is_registered
                            ? "bg-emerald-100 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/25 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/25 dark:text-amber-200"
                        }`}
                      >
                        {student.is_registered
                          ? t("students.badge.registered")
                          : t("students.badge.unregistered")}
                      </span>
                    )}
                    <span
                      className={`${badgeBase} px-1.5 py-0.5 ${
                        stayType === "weekends"
                          ? "bg-sky-100 text-sky-800 dark:border-sky-800/40 dark:bg-sky-900/25 dark:text-sky-200"
                          : stayType === "5days"
                            ? "bg-indigo-100 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200"
                            : "bg-gray-100 text-gray-600 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-100"
                      }`}
                    >
                      {stayLabel}
                    </span>
                    <span
                      className={`${badgeBase} inline-flex items-center gap-1 px-1.5 py-0.5 ${
                        student.key_issued
                          ? "bg-blue-100 text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/25 dark:text-blue-200"
                          : "bg-gray-100 text-gray-500 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
                      }`}
                    >
                      <KeyIcon className="w-3 h-3" />
                      {student.key_issued ? t("students.keyIssued") : t("students.keyNone")}
                    </span>
                    {student.key_lost && (
                      <span className={`${badgeBase} inline-flex items-center gap-1 bg-red-100 px-1.5 py-0.5 text-red-700 dark:border-rose-800/40 dark:bg-rose-900/30 dark:text-rose-200`}>
                        <KeyIcon className="w-3 h-3" />
                        {t("students.keyLost")}
                      </span>
                    )}
                    {isSuperAdmin && student.is_cleanup_admin && (
                      <span className="rounded-full border border-indigo-200 bg-indigo-100 px-1.5 py-0.5 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200">
                        {t("header.leader")}
                      </span>
                    )}
                    {isSuperAdmin && (
                      <span
                        className={`${badgeBase} px-1.5 py-0.5 ${
                          student.can_view_students
                            ? "bg-indigo-100 text-indigo-700 dark:border-violet-800/40 dark:bg-violet-900/25 dark:text-violet-200"
                            : "bg-gray-100 text-gray-500 dark:border-slate-600/50 dark:bg-slate-700/45 dark:text-slate-200"
                        }`}
                      >
                        <EyeIcon className="w-3 h-3 inline-block mr-1" />
                        {student.can_view_students ? t("students.listOpenShort") : t("students.listClosedShort")}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="p-1 text-center text-gray-700 whitespace-nowrap">{student.room || "-"}</td>
          <td className="p-1 text-center">
            {hasTelegram(student) ? (
              <TelegramIcon className="w-5 h-5 text-blue-500" />
            ) : (
              <CloseIcon className="w-5 h-5 text-gray-400" />
            )}
          </td>
          {canManageStudents && (
            <td className="p-1">
              {canManageStudent(student) && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(student)}
                    className="btn btn-primary px-2 py-1 text-xs"
                  >
                    <EditIcon className="w-3 h-3" />
                  </button>
                  {canDeleteStudents && (
                    <button
                      onClick={() => handleDeleteStudent(student)}
                      className="btn btn-danger px-2 py-1 text-xs transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    >
                      <DeleteIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </td>
          )}
        </tr>
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="bg-white/70 backdrop-blur-sm dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
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
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "all"}
                  >
                    {t("students.filter.all")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStayFilter("weekends")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "weekends"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "weekends"}
                  >
                    {t("students.stay.weekends")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStayFilter("5days")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "5days"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "5days"}
                  >
                    {t("students.stay.5days")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStayFilter("unknown")}
                    className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                      stayFilter === "unknown"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    }`}
                    aria-pressed={stayFilter === "unknown"}
                  >
                    {t("students.stay.unknown")}
                  </button>
                </div>
              </div>

              {canViewRegistration && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <span className="col-span-2 text-xs font-bold text-slate-700 dark:text-slate-200 sm:col-auto">
                    {t("students.filter.registration")}
                  </span>
                  <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setRegistrationFilter("all")}
                      className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                        registrationFilter === "all"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                      aria-pressed={registrationFilter === "all"}
                    >
                      {t("students.filter.all")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationFilter("registered")}
                      className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                        registrationFilter === "registered"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                      aria-pressed={registrationFilter === "registered"}
                    >
                      {t("students.badge.registered")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationFilter("unregistered")}
                      className={`w-full rounded-full px-3 py-1 text-xs font-semibold border sm:w-auto ${
                        registrationFilter === "unregistered"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white/50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                      }`}
                      aria-pressed={registrationFilter === "unregistered"}
                    >
                      {t("students.badge.unregistered")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 px-4">
          <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100 flex items-center gap-2 px-4">
            <RoomIcon className="w-5 h-5" />{t("students.blockA")} ({blockA.length})
          </h3>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <colgroup>
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-36" />
                {canManageStudents && <col className="w-72" />}
              </colgroup>
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700">
                  <th className="text-left p-3 font-bold text-gray-900 dark:text-slate-100">#</th>
                  <th className="text-left p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.name")}</th>
                  <th className="text-center p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.room")}</th>
                  <th className="text-center p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.telegram")}</th>
                  {canManageStudents && <th className="text-center p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {blockA.map((student, index) => renderStudentRow(student, index, blockA))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700">
                  <th className="text-left p-1 font-bold text-gray-900 dark:text-slate-100">#</th>
                  <th className="text-left p-1 font-bold text-gray-900 dark:text-slate-100">{t("students.name")}</th>
                  <th className="text-center p-1 font-bold text-gray-900 dark:text-slate-100">
                    <DoorIcon className="w-5 h-5 inline-block" />
                  </th>
                  <th className="text-center p-1 font-bold text-gray-900 dark:text-slate-100">
                    <TelegramIcon className="w-5 h-5 inline-block" />
                  </th>
                  {canManageStudents && <th className="text-left p-1 font-bold text-gray-900 dark:text-slate-100">{t("students.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {blockA.map((student, index) => renderMobileRow(student, index, blockA, "blue"))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pb-4 px-4">
          <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100 flex items-center gap-2 px-4">
            <RoomIcon className="w-5 h-5" />{t("students.blockB")} ({blockB.length})
          </h3>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <colgroup>
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-36" />
                {canManageStudents && <col className="w-72" />}
              </colgroup>
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700">
                  <th className="text-left p-3 font-bold text-gray-900 dark:text-slate-100">#</th>
                  <th className="text-left p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.name")}</th>
                  <th className="text-center p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.room")}</th>
                  <th className="text-center p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.telegram")}</th>
                  {canManageStudents && <th className="text-center p-3 font-bold text-gray-900 dark:text-slate-100">{t("students.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {blockB.map((student, index) => renderStudentRow(student, index, blockB))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700">
                  <th className="text-left p-1 font-bold text-gray-900 dark:text-slate-100">#</th>
                  <th className="text-left p-1 font-bold text-gray-900 dark:text-slate-100">{t("students.name")}</th>
                  <th className="text-center p-1 font-bold text-gray-900 dark:text-slate-100">
                    <DoorIcon className="w-5 h-5 inline-block" />
                  </th>
                  <th className="text-center p-1 font-bold text-gray-900 dark:text-slate-100">
                    <TelegramIcon className="w-5 h-5 inline-block" />
                  </th>
                  {canManageStudents && <th className="text-left p-1 font-bold text-gray-900 dark:text-slate-100">{t("students.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {blockB.map((student, index) => renderMobileRow(student, index, blockB, "green"))}
              </tbody>
            </table>
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
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">{t("students.field.firstName")}</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
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
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-slate-200">{t("students.field.room")}</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder={t("students.field.roomPlaceholder")}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
                />
              </div>

              {canManageStudents && (
                <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {t("students.stay.label")}
                    </label>
                    <select
                      value={editStayType}
                      onChange={(e) => setEditStayType(e.target.value as any)}
                      className="rounded-lg border-2 border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
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

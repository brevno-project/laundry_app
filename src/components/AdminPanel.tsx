"use client";

import { useEffect, useState } from "react";

import { useLaundry } from "@/contexts/LaundryContext";
import { useUi } from "@/contexts/UiContext";
import { Student } from "@/types";
import { EditIcon, PeopleIcon, EyeIcon, WashingSpinner } from "@/components/Icons";
import ActionMenu from "@/components/ActionMenu";
import Avatar from "@/components/Avatar";
import AddStudentModal from "@/components/AddStudentModal";
import { supabase } from "@/lib/supabase";

type Notice = { type: "success" | "error"; message: string } | null;

type FilterStatus = "all" | "registered" | "unregistered" | "banned";

export default function AdminPanel() {
  const {
    user,
    isAdmin,
    students,
    resetStudentRegistration,
    banStudent,
    unbanStudent,
    updateStudent,
    deleteStudent,
    adminAddToQueue,
    toggleAdminStatus,
    isSuperAdmin,
  } = useLaundry();
  const { t, language } = useUi();
  const locale = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : language === "ko" ? "ko-KR" : "ky-KG";

  const [showStudents, setShowStudents] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Modal state
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showBanStudent, setShowBanStudent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);
  const [showToggleAdminConfirm, setShowToggleAdminConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pendingUnbanStudent, setPendingUnbanStudent] = useState<Student | null>(null);
  const [pendingAdminToggle, setPendingAdminToggle] = useState<{
    student: Student;
    makeAdmin: boolean;
  } | null>(null);
  const [showAddToQueue, setShowAddToQueue] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isUnbanning, setIsUnbanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [isTogglingAdmin, setIsTogglingAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState<{
    action: "ban" | "toggleAdmin";
    studentId: string;
  } | null>(null);

  // Queue params
  const [queueWashCount, setQueueWashCount] = useState(1);
  const [queueCouponsUsed, setQueueCouponsUsed] = useState(0);
  const [queueDate, setQueueDate] = useState("");
  const [eligibleCouponCount, setEligibleCouponCount] = useState<number>(0);

  useEffect(() => {
    setQueueCouponsUsed((prev) => Math.min(prev, queueWashCount));
  }, [queueWashCount]);

  useEffect(() => {
    const loadEligibleCoupons = async () => {
      if (!supabase || !showAddToQueue || !selectedStudent?.id || !queueDate) {
        setEligibleCouponCount(0);
        return;
      }

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("coupons")
        .select("id, issued_at, expires_at")
        .eq("owner_student_id", selectedStudent.id)
        .is("reserved_queue_id", null)
        .is("used_at", null)
        .is("used_in_queue_id", null)
        .gt("expires_at", now.toISOString());

      if (error) {
        setEligibleCouponCount(0);
        return;
      }

      const rows = (data as any[]) || [];
      const eligible = rows.filter((coupon) => {
        const issuedAt = new Date(coupon.issued_at).getTime();
        const expiresAt = new Date(coupon.expires_at).getTime();
        const ttlMs = expiresAt - issuedAt;
        const expiresDateStr = new Date(coupon.expires_at).toISOString().slice(0, 10);

        if (ttlMs >= 24 * 60 * 60 * 1000) {
          return queueDate < expiresDateStr;
        }

        return queueDate === todayStr && expiresAt > now.getTime();
      });

      setEligibleCouponCount(eligible.length);
      setQueueCouponsUsed((prev) => Math.min(prev, Math.min(queueWashCount, eligible.length)));
    };

    void loadEligibleCoupons();
  }, [showAddToQueue, selectedStudent?.id, queueDate, queueWashCount]);

  // Edit student form
  const [editFirstname, setEditFirstname] = useState("");
  const [editLastname, setEditLastname] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editCanViewStudents, setEditCanViewStudents] = useState(false);
  const [editCleanupAdmin, setEditCleanupAdmin] = useState(false);

  // Ban form
  const [banReason, setBanReason] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const alertWithCheck = (message: string) => {
    const trimmed = message.trim();
    const suffix = trimmed.endsWith("✅") ? "" : " ✅";
    alert(`${message}${suffix}`);
  };

  // Available dates for queue (today + 7 days)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const value = date.toISOString().slice(0, 10);

      const dayName = date.toLocaleDateString(locale, { weekday: "short" });
      const day = date.getDate();
      const month = date.getMonth() + 1;

      let label = `${dayName}, ${day}.${month.toString().padStart(2, "0")}`;
      if (i === 0) label += ` (${t("queue.dateToday")})`;
      if (i === 1) label += ` (${t("queue.dateTomorrow")})`;

      dates.push({ value, label });
    }

    return dates;
  };

  const hasTelegram = (student: Student) => {
    const chat = typeof student.telegram_chat_id === "string" ? student.telegram_chat_id.trim() : "";
    return !!chat && !student.is_banned;
  };

  // Filter students
  const filteredStudents = students.filter((student) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      student.full_name.toLowerCase().includes(q) ||
      (student.room && student.room.toLowerCase().includes(q));

    const matchesFilter =
      filterStatus === "all"
        ? true
        : filterStatus === "registered"
        ? student.is_registered
        : filterStatus === "unregistered"
        ? !student.is_registered
        : filterStatus === "banned"
        ? student.is_banned
        : true;

    return matchesSearch && matchesFilter;
  });

  const openResetConfirm = (student: Student) => {
    setSelectedStudent(student);
    setShowResetConfirm(true);
  };

  const handleResetStudent = async () => {
    if (!selectedStudent || isResetting) return;

    setIsResetting(true);
    try {
      await resetStudentRegistration(selectedStudent.id);
      setShowResetConfirm(false);
      setSelectedStudent(null);
      alertWithCheck(t("admin.resetSuccess"));
    } catch (err: any) {
      alertWithCheck(t("admin.resetError"));
    } finally {
      setIsResetting(false);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    if (isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      await updateStudent(selectedStudent.id, {
        first_name: editFirstname || undefined,
        last_name: editLastname || undefined,
        room: editRoom || undefined,
        can_view_students: isSuperAdmin ? editCanViewStudents : undefined,
        is_cleanup_admin: isSuperAdmin ? editCleanupAdmin : undefined,
      });
      setShowEditStudent(false);
      setSelectedStudent(null);
      setNotice({ type: "success", message: t("students.updateSuccess") });
    } catch (err: any) {
      const message =
        typeof err?.message === "string" && err.message.trim()
          ? err.message.trim()
          : t("students.updateError");
      setNotice({ type: "error", message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleBanStudent = async () => {
    if (!selectedStudent || isBanning) return;

    setIsBanning(true);
    try {
      await banStudent(selectedStudent.id, banReason || t("ban.reasonUnknown"));
      setShowBanStudent(false);
      setSelectedStudent(null);
      setBanReason("");
      alertWithCheck(t("admin.banSuccess"));
    } catch (err: any) {
      alertWithCheck(t("admin.error", { message: err.message }));
    } finally {
      setIsBanning(false);
    }
  };

  const openUnbanModal = (student: Student) => {
    setPendingUnbanStudent(student);
    setShowUnbanConfirm(true);
    setIsUnbanning(false);
  };

  const confirmUnbanStudent = async () => {
    if (!pendingUnbanStudent || isUnbanning) return;

    setIsUnbanning(true);
    setActionLoading({ action: "ban", studentId: pendingUnbanStudent.id });
    try {
      await unbanStudent(pendingUnbanStudent.id);
      setShowUnbanConfirm(false);
      setPendingUnbanStudent(null);
      alertWithCheck(t("admin.unbanSuccess"));
    } catch (err: any) {
      alertWithCheck(t("admin.error", { message: err.message }));
    } finally {
      setIsUnbanning(false);
      setActionLoading(null);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteStudent(selectedStudent.id);
      setShowDeleteConfirm(false);
      setSelectedStudent(null);
      alertWithCheck(t("admin.deleteSuccess"));
    } catch (err: any) {
      alertWithCheck(t("admin.error", { message: err.message }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedStudent || isAddingToQueue) return;

    setIsAddingToQueue(true);
    try {
      await adminAddToQueue(
        selectedStudent.room || undefined,
        queueWashCount,
        queueCouponsUsed,
        undefined,
        queueDate,
        selectedStudent.id
      );

      setShowAddToQueue(false);
      alertWithCheck(t("admin.addQueueSuccess"));
    } catch (err: any) {
      alertWithCheck(t("admin.error", { message: err.message }));
    } finally {
      setIsAddingToQueue(false);
    }
  };

  const openToggleAdminModal = (student: Student, makeAdmin: boolean) => {
    setPendingAdminToggle({ student, makeAdmin });
    setShowToggleAdminConfirm(true);
    setIsTogglingAdmin(false);
  };

  const confirmToggleAdmin = async () => {
    if (!pendingAdminToggle || isTogglingAdmin) return;

    setIsTogglingAdmin(true);
    setActionLoading({ action: "toggleAdmin", studentId: pendingAdminToggle.student.id });
    try {
      await toggleAdminStatus(
        pendingAdminToggle.student.id,
        pendingAdminToggle.makeAdmin
      );
      alertWithCheck(
        pendingAdminToggle.makeAdmin
          ? t("admin.toggleAdminGranted")
          : t("admin.toggleAdminRevoked")
      );
      setShowToggleAdminConfirm(false);
      setPendingAdminToggle(null);
    } catch (error: any) {
      alertWithCheck(t("admin.error", { message: error.message }));
    } finally {
      setIsTogglingAdmin(false);
      setActionLoading(null);
    }
  };

  const openAddToQueueModal = (student: Student) => {
    setSelectedStudent(student);
    setQueueWashCount(1);
    setQueueCouponsUsed(0);
    const today = new Date().toISOString().slice(0, 10);
    setQueueDate(today);
    setShowAddToQueue(true);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setEditFirstname(student.first_name || "");
    setEditLastname(student.last_name || "");
    setEditRoom(student.room || "");
    setEditCanViewStudents(student.can_view_students || false);
    setEditCleanupAdmin(!!student.is_cleanup_admin);
    setIsSavingEdit(false);
    setShowEditStudent(true);
  };

  const openBanModal = (student: Student) => {
    setSelectedStudent(student);
    setBanReason("");
    setShowBanStudent(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteConfirm(true);
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
        <h2 className="mb-3 text-2xl font-bold text-yellow-800">
          {t("admin.loginRequiredTitle")}
        </h2>
        <p className="mb-2 text-sm text-yellow-800">
          {t("admin.loginRequiredBody")}
        </p>
        <p className="text-xs text-yellow-700">
          {t("admin.loginRequiredHint")}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">{t("admin.loginPromptTitle")}</h2>
        <p className="text-sm text-gray-700">{t("admin.loginPromptBody")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-800 p-4 shadow-lg mb-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">{t("admin.panelTitle")}</h2>
            <p className="mt-1 text-base text-slate-200">
              {isSuperAdmin ? t("admin.panelModeSuper") : t("admin.panelModeAdmin")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowStudents((v) => !v)}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <PeopleIcon className="h-5 w-5" />
          {showStudents ? t("admin.studentsToggleHide") : t("admin.studentsToggleShow")}
        </button>

        {showStudents && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
            {notice && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  notice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-100"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-rose-500/40 dark:bg-rose-900/20 dark:text-rose-100"
                }`}
              >
                {notice.message}
              </div>
            )}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {t("admin.studentsCount", { count: filteredStudents.length })}
              </h3>

              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(true)}
                  className="flex flex-1 items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  {t("admin.addStudent")}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("admin.searchPlaceholder")}
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
              />

              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                <FilterButton
                  active={filterStatus === "all"}
                  onClick={() => setFilterStatus("all")}
                  label={t("admin.filter.all")}
                />
                <FilterButton
                  active={filterStatus === "registered"}
                  onClick={() => setFilterStatus("registered")}
                  label={t("admin.filter.registered")}
                />
                <FilterButton
                  active={filterStatus === "unregistered"}
                  onClick={() => setFilterStatus("unregistered")}
                  label={t("admin.filter.unregistered")}
                />
                <FilterButton
                  active={filterStatus === "banned"}
                  onClick={() => setFilterStatus("banned")}
                  label={t("admin.filter.banned")}
                />
              </div>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 p-3"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={student.full_name}
                      style={student.avatar_style}
                      seed={student.avatar_seed}
                      className="w-12 h-12 flex-shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-gray-900 break-words dark:text-slate-100">
                        {student.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-300">
                        {student.room || t("admin.roomMissing")}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        {student.is_registered && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200">
                            {t("admin.status.registered")}
                          </span>
                        )}

                        {!student.is_registered && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                            {t("admin.status.unregistered")}
                          </span>
                        )}

                        {student.is_banned && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-rose-900/30 dark:text-rose-200">
                            {t("admin.status.banned")}
                          </span>
                        )}

                        {hasTelegram(student) && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/25 dark:text-blue-200">
                            Telegram
                          </span>
                        )}

                        {student.is_admin && !student.is_super_admin && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                            {t("admin.status.admin")}
                          </span>
                        )}

                        {student.is_super_admin && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-800 dark:bg-amber-900/30 dark:text-amber-200">
                            {t("admin.status.superAdmin")}
                          </span>
                        )}

                        {student.is_cleanup_admin && (
                            <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200">
                              {t("admin.status.leader")}
                            </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <ActionMenu
                      student={student}
                      isAdmin={isAdmin}
                      isSuperAdmin={isSuperAdmin}
                      currentUserId={user?.id}
                      onEdit={openEditModal}
                      onBan={openBanModal}
                      onUnban={openUnbanModal}
                      onDelete={openDeleteModal}
                      onReset={openResetConfirm}
                      onAddToQueue={openAddToQueueModal}
                      onToggleAdmin={openToggleAdminModal}
                      loadingAction={actionLoading}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddStudent && <AddStudentModal onClose={() => setShowAddStudent(false)} />}

      {showEditStudent && selectedStudent && (
        <Modal onClose={() => setShowEditStudent(false)}>
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-slate-100">
            <EditIcon className="h-5 w-5" />
            {t("admin.editTitle")}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={editFirstname}
              onChange={(e) => setEditFirstname(e.target.value)}
              placeholder={t("students.field.firstNamePlaceholder")}
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
            />
            <input
              type="text"
              value={editLastname}
              onChange={(e) => setEditLastname(e.target.value)}
              placeholder={t("students.field.lastNamePlaceholder")}
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
            />
            <input
              type="text"
              value={editRoom}
              onChange={(e) => setEditRoom(e.target.value)}
              placeholder={t("students.field.roomPlaceholder")}
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
            />
            {isSuperAdmin && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <input
                  type="checkbox"
                  id="adminEditCanViewStudents"
                  checked={editCanViewStudents}
                  onChange={(e) => setEditCanViewStudents(e.target.checked)}
                  className="h-5 w-5 cursor-pointer"
                />
                <label
                  htmlFor="adminEditCanViewStudents"
                  className="text-sm font-semibold text-gray-900 flex items-center gap-1 dark:text-slate-200"
                >
                  <EyeIcon className="w-4 h-4" />
                  {t("students.canView")}
                </label>
              </div>
            )}

            {isSuperAdmin && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <input
                  type="checkbox"
                  id="adminEditCleanupAdmin"
                  checked={editCleanupAdmin}
                  onChange={(e) => setEditCleanupAdmin(e.target.checked)}
                  className="h-5 w-5 cursor-pointer"
                />
                <label
                  htmlFor="adminEditCleanupAdmin"
                  className="text-sm font-semibold text-gray-900 dark:text-slate-200"
                >
                  {t("admin.status.leader")}
                </label>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditStudent(false)}
              disabled={isSavingEdit}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleEditStudent}
              disabled={isSavingEdit}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSavingEdit ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.saving")}
                </>
              ) : (
                t("common.save")
              )}
            </button>
          </div>
        </Modal>
      )}

      {showResetConfirm && selectedStudent && (
        <Modal onClose={() => setShowResetConfirm(false)}>
          <h3 className="mb-3 text-xl font-bold text-orange-700 dark:text-amber-200">{t("admin.resetTitle")}</h3>
          <p className="mb-3 text-sm text-gray-800 dark:text-slate-200">
            {t("admin.resetConfirm", { name: selectedStudent.full_name })}
          </p>
          <p className="mb-4 text-xs font-semibold text-orange-600 dark:text-amber-200">
            {t("admin.resetHint")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleResetStudent}
              disabled={isResetting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isResetting ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.loading")}
                </>
              ) : (
                t("admin.resetAction")
              )}
            </button>
          </div>
        </Modal>
      )}

      {showBanStudent && selectedStudent && (
        <Modal onClose={() => setShowBanStudent(false)}>
          <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-slate-100">{t("admin.banTitle")}</h3>
          <p className="mb-3 text-sm text-gray-800 dark:text-slate-200">
            {t("admin.banConfirm", { name: selectedStudent.full_name })}
          </p>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder={t("admin.banPlaceholder")}
            className="h-24 w-full rounded-lg border-2 border-gray-300 p-3 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowBanStudent(false)}
              disabled={isBanning}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleBanStudent}
              disabled={isBanning}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isBanning ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.loading")}
                </>
              ) : (
                t("admin.banAction")
              )}
            </button>
          </div>
        </Modal>
      )}

      {showUnbanConfirm && pendingUnbanStudent && (
        <Modal
          onClose={() => {
            setShowUnbanConfirm(false);
            setPendingUnbanStudent(null);
          }}
        >
          <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-slate-100">{t("admin.unbanTitle")}</h3>
          <p className="mb-4 text-sm text-gray-800 dark:text-slate-200">
            {t("admin.unbanConfirm", { name: pendingUnbanStudent.full_name })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUnbanConfirm(false);
                setPendingUnbanStudent(null);
              }}
              disabled={isUnbanning}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmUnbanStudent}
              disabled={isUnbanning}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUnbanning ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.loading")}
                </>
              ) : (
                t("admin.action.unban")
              )}
            </button>
          </div>
        </Modal>
      )}

      {showToggleAdminConfirm && pendingAdminToggle && (
        <Modal
          onClose={() => {
            setShowToggleAdminConfirm(false);
            setPendingAdminToggle(null);
          }}
        >
          <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-slate-100">{t("admin.toggleAdminTitle")}</h3>
          <p className="mb-4 text-sm text-gray-800 dark:text-slate-200">
            {pendingAdminToggle.makeAdmin
              ? t("admin.toggleAdminConfirmGrant", { name: pendingAdminToggle.student.full_name })
              : t("admin.toggleAdminConfirmRevoke", { name: pendingAdminToggle.student.full_name })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowToggleAdminConfirm(false);
                setPendingAdminToggle(null);
              }}
              disabled={isTogglingAdmin}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmToggleAdmin}
              disabled={isTogglingAdmin}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isTogglingAdmin ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.loading")}
                </>
              ) : pendingAdminToggle.makeAdmin ? (
                t("admin.action.makeAdmin")
              ) : (
                t("admin.action.removeAdmin")
              )}
            </button>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && selectedStudent && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <h3 className="mb-3 text-xl font-bold text-red-700 dark:text-rose-200">{t("admin.deleteTitle")}</h3>
          <p className="mb-3 text-sm text-gray-800 dark:text-slate-200">
            {t("admin.deleteConfirm", { name: selectedStudent.full_name })}
          </p>
          <p className="mb-4 text-xs font-semibold text-red-600 dark:text-rose-200">
            {t("admin.deleteHint")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleDeleteStudent}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.loading")}
                </>
              ) : (
                t("admin.deleteAction")
              )}
            </button>
          </div>
        </Modal>
      )}

      {showAddToQueue && selectedStudent && (
        <Modal onClose={() => setShowAddToQueue(false)}>
          <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-slate-100">{t("admin.addQueueTitle")}</h3>
          <p className="mb-3 text-sm text-gray-800 dark:text-slate-200">
            {t("admin.addQueueStudent")}: {" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>
          </p>

          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block font-semibold text-gray-900 dark:text-slate-100">{t("admin.addQueueDate")}</label>
              <select
                value={queueDate}
                onChange={(e) => setQueueDate(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
              >
                {getAvailableDates().map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-gray-900 dark:text-slate-100">{t("admin.addQueueWashCount")}</label>
              <select
                value={queueWashCount}
                onChange={(e) => setQueueWashCount(Number(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-gray-900 dark:text-slate-100">{t("admin.addQueueCoupons")}</label>
              {eligibleCouponCount > 0 ? (
                <>
                  <select
                    value={queueCouponsUsed}
                    onChange={(e) => setQueueCouponsUsed(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100"
                  >
                    {Array.from({ length: Math.min(queueWashCount, eligibleCouponCount) + 1 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {t("admin.addQueueHint")}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddToQueue(false)}
              disabled={isAddingToQueue}
              className="flex-1 flex items-center justify-center rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleAddToQueue}
              disabled={isAddingToQueue}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAddingToQueue ? (
                <>
                  <WashingSpinner className="w-4 h-4" />
                  {t("common.loading")}
                </>
              ) : (
                t("admin.addQueueAction")
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-2 text-center ${
        active
          ? "bg-slate-800 text-white dark:bg-slate-700"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Close only when the press starts on backdrop itself (not on modal content).
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-6 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}
